// Studio scheduled-publish Worker. Runs on a Cron Trigger (see
// wrangler.toml), queries D1 for posts whose scheduled_at has passed,
// and publishes each one to GitHub using the exact same shared logic as
// the admin's "Publish Now" button (src/lib/studioPublisher.ts /
// studioRepository.ts) — there is only one publication implementation.
import { getDuePosts, markPublished, recordPublishError } from "../../../src/lib/studioRepository";
import { publishPostToGithub, type GithubConfig } from "../../../src/lib/studioPublisher";

export interface Env {
  STUDIO_DB: D1Database;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
  GITHUB_CONTENT_PATH?: string;
}

export async function processDuePosts(env: Env): Promise<void> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH || !env.GITHUB_CONTENT_PATH) {
    console.error("Studio scheduler: publishing backend not configured — skipping this run.");
    return;
  }

  const config: GithubConfig = {
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH,
    contentPath: env.GITHUB_CONTENT_PATH,
    token: env.GITHUB_TOKEN,
  };

  const duePosts = await getDuePosts(env.STUDIO_DB, new Date().toISOString());

  // Serial on purpose: never send concurrent writes to the same public
  // content file — each publish reads-merges-writes the whole file.
  for (const post of duePosts) {
    const publishedAt = new Date().toISOString();
    const result = await publishPostToGithub(config, { ...post, status: "published", publishedAt });

    if (result.ok) {
      await markPublished(env.STUDIO_DB, post.id, publishedAt, result.commitSha);
    } else {
      // Never mark a failed attempt published, and never drop the post —
      // it stays "scheduled" with its original scheduled_at, and will be
      // picked up again on the next cron tick.
      await recordPublishError(env.STUDIO_DB, post.id, result.error);
    }
  }
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(processDuePosts(env));
  },
} satisfies ExportedHandler<Env>;
