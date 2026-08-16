import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, logAdminIssue, newRequestId, type Env } from "../../../../_shared/env";
import { deletePost, getPost, recordPublishError, updatePost } from "../../../../../src/lib/studioRepository";
import { removePostFromGithub, type GithubConfig, type StudioPost } from "../../../../../src/lib/studioPublisher";

const ROUTE = "/api/admin/posts/:id";

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
  const requestId = newRequestId();
  const id = paramId(context.params);

  try {
    const post = await getPost(context.env.STUDIO_DB, id);
    if (!post) return errorJson("Post not found.", 404, "NOT_FOUND", requestId);
    return json({ post }, undefined, requestId);
  } catch (error) {
    logAdminIssue({ requestId, code: "D1_READ_FAILED", route: ROUTE, method: "GET", postId: id, error });
    return errorJson("Could not load this post.", 500, "D1_READ_FAILED", requestId);
  }
};

/** Edits editorial content (title, body, category, etc.). Drafts may stay
    drafts here, while an already-published post must keep its published
    state until Publish Now updates the public GitHub copy or Delete removes
    that copy first. Scheduled publishing has been retired. */
export const onRequestPatch: PagesFunction<Env, "id"> = async (context) => {
  const requestId = newRequestId();
  const id = paramId(context.params);

  let patch: Partial<StudioPost>;
  try {
    const parsed: unknown = await context.request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorJson("JSON body must be an object.", 400, "INVALID_JSON", requestId);
    }
    patch = parsed as Partial<StudioPost>;
  } catch {
    return errorJson("Invalid JSON body.", 400, "INVALID_JSON", requestId);
  }

  let existing: StudioPost | null;
  try {
    existing = await getPost(context.env.STUDIO_DB, id);
  } catch (error) {
    logAdminIssue({ requestId, code: "D1_READ_FAILED", route: ROUTE, method: "PATCH", postId: id, error });
    return errorJson("Could not load the current post before saving.", 500, "D1_READ_FAILED", requestId);
  }
  if (!existing) return errorJson("Post not found.", 404, "NOT_FOUND", requestId);

  if (typeof patch.updatedAt === "string" && patch.updatedAt !== existing.updatedAt) {
    logAdminIssue({ requestId, code: "VERSION_CONFLICT", route: ROUTE, method: "PATCH", postId: id, level: "warn" });
    return errorJson(
      "This post changed in another tab. Refresh before saving so newer edits are not overwritten.",
      409,
      "VERSION_CONFLICT",
      requestId,
    );
  }

  if (patch.status === "published") {
    return errorJson(
      "Use POST /api/admin/posts/:id/publish to publish — this route cannot set status directly.",
      400,
      "INVALID_STATE",
      requestId,
    );
  }

  if (patch.status === "scheduled" || patch.scheduledAt) {
    return errorJson("Scheduled publishing is retired. Save as draft or use Publish Now.", 400, "INVALID_STATE", requestId);
  }

  if (existing.status === "published" && patch.status === "draft") {
    return errorJson(
      "This post is already published. Save edits without changing its status, then use Publish Now to update the public copy.",
      409,
      "INVALID_STATE",
      requestId,
    );
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

  if (editorialFingerprint(next) === editorialFingerprint(existing)) {
    return json({ post: existing, unchanged: true }, undefined, requestId);
  }

  next.updatedAt = nextVersionTime(existing.updatedAt);

  try {
    const updated = await updatePost(context.env.STUDIO_DB, next, existing.updatedAt);
    if (!updated) {
      logAdminIssue({ requestId, code: "VERSION_CONFLICT", route: ROUTE, method: "PATCH", postId: id, level: "warn" });
      return errorJson(
        "This post changed while your save was being written. Refresh before trying again.",
        409,
        "VERSION_CONFLICT",
        requestId,
      );
    }
    return json({ post: next, unchanged: false }, undefined, requestId);
  } catch (error) {
    logAdminIssue({ requestId, code: "D1_WRITE_FAILED", route: ROUTE, method: "PATCH", postId: id, error });
    return errorJson("Could not save this post.", 500, "D1_WRITE_FAILED", requestId);
  }
};

/** Deleting a draft only touches D1. Deleting a published post removes the
    public GitHub copy first. The final D1 DELETE is version-conditional so
    a concurrent edit is preserved rather than silently discarded. */
export const onRequestDelete: PagesFunction<Env, "id"> = async (context) => {
  const requestId = newRequestId();
  const { env } = context;
  const id = paramId(context.params);

  let expectedUpdatedAt: string | undefined;
  try {
    expectedUpdatedAt = await optionalExpectedVersion(context.request);
  } catch {
    return errorJson("Invalid JSON body.", 400, "INVALID_JSON", requestId);
  }

  let existing: StudioPost | null;
  try {
    existing = await getPost(env.STUDIO_DB, id);
  } catch (error) {
    logAdminIssue({ requestId, code: "D1_READ_FAILED", route: ROUTE, method: "DELETE", postId: id, error });
    return errorJson("Could not load this post before deleting it.", 500, "D1_READ_FAILED", requestId);
  }
  if (!existing) return errorJson("Post not found.", 404, "NOT_FOUND", requestId);

  if (expectedUpdatedAt && expectedUpdatedAt !== existing.updatedAt) {
    logAdminIssue({ requestId, code: "VERSION_CONFLICT", route: ROUTE, method: "DELETE", postId: id, level: "warn" });
    return errorJson("This post changed in another tab. Refresh before deleting it.", 409, "VERSION_CONFLICT", requestId);
  }

  if (existing.status === "published") {
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH || !env.GITHUB_CONTENT_PATH) {
      logAdminIssue({ requestId, code: "BACKEND_CONFIG_MISSING", route: ROUTE, method: "DELETE", postId: id });
      return errorJson(
        "Publishing backend not configured. Could not delete this post.",
        503,
        "BACKEND_CONFIG_MISSING",
        requestId,
      );
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
      logAdminIssue({ requestId, code: "GITHUB_DELETE_FAILED", route: ROUTE, method: "DELETE", postId: id, error: result.error });
      try {
        await recordPublishError(env.STUDIO_DB, id, result.error);
      } catch (recordError) {
        logAdminIssue({ requestId, code: "D1_WRITE_FAILED", route: ROUTE, method: "DELETE", postId: id, error: recordError });
      }
      return errorJson(
        `Could not delete this post. The published version is still live. ${result.error}`,
        502,
        "GITHUB_DELETE_FAILED",
        requestId,
      );
    }
  }

  try {
    const deleted = await deletePost(env.STUDIO_DB, id, existing.updatedAt);
    if (!deleted) {
      logAdminIssue({ requestId, code: "VERSION_CONFLICT", route: ROUTE, method: "DELETE", postId: id, level: "warn" });
      return errorJson(
        "This post changed while deletion was in progress. Refresh before trying again. If it was published, use Publish Now to restore the latest public copy before deciding whether to delete it again.",
        409,
        "VERSION_CONFLICT",
        requestId,
      );
    }
    return json({ ok: true }, undefined, requestId);
  } catch (error) {
    logAdminIssue({ requestId, code: "D1_DELETE_FAILED", route: ROUTE, method: "DELETE", postId: id, error });
    return errorJson("Could not finish deleting this post.", 500, "D1_DELETE_FAILED", requestId);
  }
};
