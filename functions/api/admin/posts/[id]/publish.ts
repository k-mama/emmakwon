import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, type Env } from "../../../../_shared/env";
import { getPost, markPublished, recordPublishError } from "../../../../../src/lib/studioRepository";
import { publishPostToGithub, validatePost, type GithubConfig, type StudioPost } from "../../../../../src/lib/studioPublisher";
import { sanitizePublicExternalMedia } from "../../../../../src/lib/publicUrl";

async function expectedVersion(request: Request): Promise<string | undefined> {
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

/**
 * The one real "Publish Now" path: verify the exact saved version →
 * validate → sanitize public-only link fields → commit to GitHub → record
 * that a public copy exists in D1. Repeating an already-current publish is
 * idempotent and does not create another GitHub/Cloudflare build.
 */
export const onRequestPost: PagesFunction<Env, "id"> = async (context) => {
  const { env } = context;
  const rawId = context.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  let expectedUpdatedAt: string | undefined;
  try {
    expectedUpdatedAt = await expectedVersion(context.request);
  } catch {
    return errorJson("Invalid JSON body.", 400);
  }

  let post: StudioPost | null;
  try {
    post = await getPost(env.STUDIO_DB, id);
  } catch (error) {
    console.error("Studio publish read failed", error);
    return errorJson("Could not load the saved post before publishing.", 500);
  }
  if (!post) return errorJson("Post not found.", 404);

  if (expectedUpdatedAt && expectedUpdatedAt !== post.updatedAt) {
    return errorJson("This post changed after this tab saved it. Refresh before publishing so the wrong version is not sent live.", 409);
  }

  const validation = validatePost(post);
  if (!validation.valid) {
    return errorJson(`Cannot publish: ${validation.errors.join(" ")}`, 422);
  }

  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH || !env.GITHUB_CONTENT_PATH) {
    return errorJson("Publishing backend not configured.", 503);
  }

  const config: GithubConfig = {
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH,
    contentPath: env.GITHUB_CONTENT_PATH,
    token: env.GITHUB_TOKEN,
  };

  const publishedAt = post.publishedAt ?? new Date().toISOString();
  const result = await publishPostToGithub(config, {
    ...post,
    status: "published",
    publishedAt,
    externalMedia: sanitizePublicExternalMedia(post.externalMedia),
  });

  if (!result.ok) {
    try {
      await recordPublishError(env.STUDIO_DB, post.id, result.error);
    } catch (recordError) {
      console.error("Could not record Studio publish error", recordError);
    }
    return errorJson(result.error, 502);
  }

  try {
    const finalized = await markPublished(env.STUDIO_DB, post.id, publishedAt, result.commitSha);
    if (!finalized) {
      return errorJson(
        "The public GitHub copy may have been updated, but the admin row disappeared before publication could be finalized. Refresh the admin before doing anything else.",
        500,
      );
    }
  } catch (error) {
    console.error("Studio publish finalization failed", error);
    return errorJson(
      "The public GitHub copy may have been updated, but the admin could not record the result. Refresh before retrying Publish Now.",
      500,
    );
  }

  return json({
    ok: true,
    commitSha: result.commitSha ?? null,
    publishedAt,
    unchanged: result.unchanged,
  });
};
