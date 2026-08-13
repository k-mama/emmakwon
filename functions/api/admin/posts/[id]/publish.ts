import type { PagesFunction } from "@cloudflare/workers-types";
import { errorJson, json, type Env } from "../../../../_shared/env";
import { getPost, markPublished, recordPublishError } from "../../../../../src/lib/studioRepository";
import { publishPostToGithub, validatePost, type GithubConfig } from "../../../../../src/lib/studioPublisher";

function paramId(params: Record<string, string | string[]>): string {
  const value = params.id;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The one real "Publish Now" / scheduled-publish path: validate → commit
 * to GitHub → only on success, flip D1 status to published. On failure
 * the D1 row is left exactly as it was (still draft/scheduled), with
 * last_publish_error recorded so the admin can show a clear reason.
 */
export const onRequestPost: PagesFunction<Env, "id"> = async (context) => {
  const { env } = context;
  const id = paramId(context.params);
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
  const result = await publishPostToGithub(config, { ...post, status: "published", publishedAt });

  if (!result.ok) {
    await recordPublishError(env.STUDIO_DB, post.id, result.error);
    return errorJson(result.error, 502);
  }

  await markPublished(env.STUDIO_DB, post.id, publishedAt, result.commitSha);
  return json({ ok: true, commitSha: result.commitSha, publishedAt });
};
