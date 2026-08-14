import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, type Env } from "../../../../_shared/env";
import { deletePost, getPost, updatePost } from "../../../../../src/lib/studioRepository";
import type { StudioPost } from "../../../../../src/lib/studioPublisher";

function paramId(params: Record<string, string | string[]>): string {
  const value = params.id;
  return Array.isArray(value) ? value[0] : value;
}

export const onRequestGet: PagesFunction<Env, "id"> = async (context) => {
  const post = await getPost(context.env.STUDIO_DB, paramId(context.params));
  if (!post) return errorJson("Post not found.", 404);
  return json({ post });
};

/** Edits editorial content (title, body, category, etc.) and lets the
    admin explicitly move a post to "draft" or "scheduled" — publishing
    TO "published" only ever happens via POST .../publish, which is the
    only route allowed to write to GitHub. */
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

  const next: StudioPost = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  // Normalize to a canonical UTC "Z" timestamp regardless of what offset
  // the client sent (the admin UI sends Brisbane's fixed +10:00) — keeps
  // any stored scheduled_at values consistently comparable, whether or
  // not anything currently reads them. Only touch it when the client
  // actually sent the key: a PATCH that omits scheduledAt entirely (e.g.
  // a plain title edit) must not wipe an existing scheduled time.
  if ("scheduledAt" in patch) {
    next.scheduledAt = patch.scheduledAt ? new Date(patch.scheduledAt).toISOString() : undefined;
  }

  try {
    await updatePost(context.env.STUDIO_DB, next);
    return json({ post: next });
  } catch (error) {
    return errorJson(error instanceof Error ? error.message : "Failed to save.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env, "id"> = async (context) => {
  const id = paramId(context.params);
  const existing = await getPost(context.env.STUDIO_DB, id);
  if (!existing) return errorJson("Post not found.", 404);

  await deletePost(context.env.STUDIO_DB, id);
  return json({ ok: true });
};
