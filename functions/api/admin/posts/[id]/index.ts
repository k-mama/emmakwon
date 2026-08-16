import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, type Env } from "../../../../_shared/env";
import { deletePost, getPost, recordPublishError, updatePost } from "../../../../../src/lib/studioRepository";
import { removePostFromGithub, type GithubConfig, type StudioPost } from "../../../../../src/lib/studioPublisher";

function paramId(params: Record<string, string | string[]>): string {
  const value = params.id;
  return Array.isArray(value) ? value[0] : value;
}

function nextVersionTime(previous: string): string {
  const previousMs = Date.parse(previous);
  const now = Date.now();
  return new Date(Number.isFinite(previousMs) ? Math.max(now, previousMs + 1) : now).toISOString();
}

function editorialFingerprint(post: StudioPost): string {
  return JSON.stringify({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    body: post.body,
    category: post.category,
    tags: post.tags,
    status: post.status,
    publishedAt: post.publishedAt,
    scheduledAt: post.scheduledAt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    externalMedia: post.externalMedia,
  });
}

async function optionalExpectedVersion(request: Request): Promise<string | undefined> {
  const text = await request.text();
  if (!text.trim()) return undefined;

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_JSON");
  const value = (body as { expectedUpdatedAt?: unknown }).expectedUpdatedAt;
  return typeof value === "string" && value ? value : undefined;
}

export const onRequestGet: PagesFunction<Env, "id"> = async (context) => {
  try {
    const post = await getPost(context.env.STUDIO_DB, paramId(context.params));
    if (!post) return errorJson("Post not found.", 404);
    return json({ post });
  } catch (error) {
    console.error("Studio admin GET failed", error);
    return errorJson("Could not load this post.", 500);
  }
};

/** Edits editorial content (title, body, category, etc.). Drafts may stay
    drafts here, while an already-published post must keep its published
    state until Publish Now updates the public GitHub copy or Delete removes
    that copy first. Scheduled publishing has been retired. */
export const onRequestPatch: PagesFunction<Env, "id"> = async (context) => {
  const id = paramId(context.params);

  let patch: Partial<StudioPost>;
  try {
    const parsed: unknown = await context.request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorJson("JSON body must be an object.", 400);
    }
    patch = parsed as Partial<StudioPost>;
  } catch {
    return errorJson("Invalid JSON body.", 400);
  }

  let existing: StudioPost | null;
  try {
    existing = await getPost(context.env.STUDIO_DB, id);
  } catch (error) {
    console.error("Studio admin PATCH read failed", error);
    return errorJson("Could not load the current post before saving.", 500);
  }
  if (!existing) return errorJson("Post not found.", 404);

  if (typeof patch.updatedAt === "string" && patch.updatedAt !== existing.updatedAt) {
    return errorJson("This post changed in another tab. Refresh before saving so newer edits are not overwritten.", 409);
  }

  if (patch.status === "published") {
    return errorJson("Use POST /api/admin/posts/:id/publish to publish — this route cannot set status directly.", 400);
  }

  if (patch.status === "scheduled" || patch.scheduledAt) {
    return errorJson("Scheduled publishing is retired. Save as draft or use Publish Now.", 400);
  }

  if (existing.status === "published" && patch.status === "draft") {
    return errorJson("This post is already published. Save edits without changing its status, then use Publish Now to update the public copy.", 409);
  }

  const next: StudioPost = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
  };

  if (patch.status === "draft" || ("scheduledAt" in patch && !patch.scheduledAt)) {
    next.scheduledAt = undefined;
  }

  // Repeated Save/Publish clicks with no editorial change should not create
  // a fake new version. Returning the existing row also lets Publish Now
  // detect an already-current public JSON and avoid a duplicate GitHub commit.
  if (editorialFingerprint(next) === editorialFingerprint(existing)) {
    return json({ post: existing, unchanged: true });
  }

  next.updatedAt = nextVersionTime(existing.updatedAt);

  try {
    const updated = await updatePost(context.env.STUDIO_DB, next, existing.updatedAt);
    if (!updated) {
      return errorJson("This post changed while your save was being written. Refresh before trying again.", 409);
    }
    return json({ post: next, unchanged: false });
  } catch (error) {
    console.error("Studio admin PATCH write failed", error);
    return errorJson("Could not save this post.", 500);
  }
};

/** Deleting a draft only touches D1. Deleting a published post removes the
    public GitHub copy first. The final D1 DELETE is version-conditional so
    a concurrent edit is preserved rather than silently discarded. */
export const onRequestDelete: PagesFunction<Env, "id"> = async (context) => {
  const { env } = context;
  const id = paramId(context.params);

  let expectedUpdatedAt: string | undefined;
  try {
    expectedUpdatedAt = await optionalExpectedVersion(context.request);
  } catch {
    return errorJson("Invalid JSON body.", 400);
  }

  let existing: StudioPost | null;
  try {
    existing = await getPost(env.STUDIO_DB, id);
  } catch (error) {
    console.error("Studio admin DELETE read failed", error);
    return errorJson("Could not load this post before deleting it.", 500);
  }
  if (!existing) return errorJson("Post not found.", 404);

  if (expectedUpdatedAt && expectedUpdatedAt !== existing.updatedAt) {
    return errorJson("This post changed in another tab. Refresh before deleting it.", 409);
  }

  if (existing.status === "published") {
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH || !env.GITHUB_CONTENT_PATH) {
      return errorJson("Publishing backend not configured. Could not delete this post.", 503);
    }

    const config: GithubConfig = {
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      branch: env.GITHUB_BRANCH,
      contentPath: env.GITHUB_CONTENT_PATH,
      token: env.GITHUB_TOKEN,
    };

    const result = await removePostFromGithub(config, existing.id, existing.title);
    if (!result.ok) {
      try {
        await recordPublishError(env.STUDIO_DB, id, result.error);
      } catch (recordError) {
        console.error("Could not record Studio delete/publish error", recordError);
      }
      return errorJson(`Could not delete this post. The published version is still live. ${result.error}`, 502);
    }
  }

  try {
    const deleted = await deletePost(env.STUDIO_DB, id, existing.updatedAt);
    if (!deleted) {
      return errorJson(
        "This post changed while deletion was in progress. Refresh before trying again. If it was published, use Publish Now to restore the latest public copy before deciding whether to delete it again.",
        409,
      );
    }
    return json({ ok: true });
  } catch (error) {
    console.error("Studio admin DELETE write failed", error);
    return errorJson("Could not finish deleting this post.", 500);
  }
};
