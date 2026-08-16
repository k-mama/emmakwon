import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, type Env } from "../../../../_shared/env";
import { getPost, markPublished, recordPublishError } from "../../../../../src/lib/studioRepository";
import { publishPostToGithub, validatePost, type GithubConfig } from "../../../../../src/lib/studioPublisher";
import { sanitizePublicExternalMedia } from "../../../../../src/lib/publicUrl";

/**
 * The one real "Publish Now" path: validate → sanitize public-only link
 * fields → commit to GitHub → only on success, flip D1 status to published.
 * On failure the D1 row keeps its existing editorial state, with
 * last_publish_error recorded so the admin can show a clear reason.
 */
export const onRequestPost: PagesFunction<Env, "id"> = async (context) => {
  const { env } = context;
  const rawId = context.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const post = await getPost(env.STUDIO_DB, id);
  if (!post) return errorJson("Post not found.", 404);

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
    await recordPublishError(env.STUDIO_DB, post.id, result.error);
    return errorJson(result.error, 502);
  }

  await markPublished(env.STUDIO_DB, post.id, publishedAt, result.commitSha);
  return json({ ok: true, commitSha: result.commitSha, publishedAt });
};
