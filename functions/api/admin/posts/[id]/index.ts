import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, type Env } from "../../../../_shared/env";
import { deletePost, getPost, recordPublishError, updatePost } from "../../../../../src/lib/studioRepository";
import { removePostFromGithub, type GithubConfig, type StudioPost } from "../../../../../src/lib/studioPublisher";

function paramId(params: Record<string, string | string[]>): string {
  const value = params.id;
  return Array.isArray(value) ? value[0] : value;
}

export const onRequestGet: PagesFunction<Env, "id"> = async (context) => {
  const post = await getPost(context.env.STUDIO_DB, paramId(context.params));
  if (!post) return errorJson("Post not found.", 404);
  return json({ post });
};

/** Edits editorial content (title, body, category, etc.). The admin may
    save a post as a draft here; publishing to "published" only ever
    happens via POST .../publish. Scheduled publishing has been retired. */
export const onRequestPatch: PagesFunction<Env, "id"> = async (context) => {
  const id = paramId(context.params);
  const existing = await getPost(context.env.STUDIO_DB, id);
  if (!existing) return errorJson("Post not found.", 404);

  let patch: Partial<StudioPost>;
  try {
    patch = await context.request.json();
  } catch {
    return errorJson("Invalid JSON body.", 400);
  }

  if (patch.status === "published") {
    return errorJson("Use POST /api/admin/posts/:id/publish to publish — this route cannot set status directly.", 400);
  }

  if (patch.status === "scheduled" || patch.scheduledAt) {
    return errorJson("Scheduled publishing is retired. Save as draft or use Publish Now.", 400);
  }

  const next: StudioPost = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  // A legacy scheduled_at value may still exist on an old D1 row. The only
  // supported write now is to clear it while returning that row to draft.
  if ("scheduledAt" in patch && !patch.scheduledAt) {
    next.scheduledAt = undefined;
  }

  try {
    await updatePost(context.env.STUDIO_DB, next);
    return json({ post: next });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Failed to save.", 500);
  }
};

/** Deleting a draft (or a legacy scheduled record) only ever touched D1.
    Deleting an already-published post must also remove it from the
    public GitHub content file first — otherwise Admin would report
    "deleted" while the article stays silently live on the public site.
    D1 is only cleared once GitHub confirms the removal, so a failed
    attempt leaves the post exactly as it was (still published, still
    deletable) rather than losing track of it. */
export const onRequestDelete: PagesFunction<Env, "id"> = async (context) => {
  const { env } = context;
  const id = paramId(context.params);
  const existing = await getPost(env.STUDIO_DB, id);
  if (!existing) return errorJson("Post not found.", 404);

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
      await recordPublishError(env.STUDIO_DB, id, result.error);
      return errorJson(`Could not delete this post. The published version is still live. ${result.error}`, 502);
    }
  }

  await deletePost(env.STUDIO_DB, id);
  return json({ ok: true });
};
