// D1 access for studio_posts, used by the admin Pages Functions
// (functions/api/admin/**) — the site's only D1 consumer. Publishing to
// the public site is manual (Publish Now) — there is no scheduler or
// standalone Worker; see CLOUDFLARE_SETUP.md for the final architecture.
// Uses the Cloudflare Workers D1Database type; this file is excluded
// from the Next.js build's type-check (see tsconfig.json) since it's
// only ever bundled by wrangler, not by Next.
import type { D1Database } from "@cloudflare/workers-types";
import { rowToPost, type StudioPost, type StudioPostRow } from "./studioPublisher";

function toRowValues(post: StudioPost) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    cover_image: post.coverImage ?? null,
    body: JSON.stringify(post.body ?? []),
    category: post.category,
    tags: JSON.stringify(post.tags ?? []),
    status: post.status,
    published_at: post.publishedAt ?? null,
    scheduled_at: post.scheduledAt ?? null,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
    seo_title: post.seoTitle ?? null,
    seo_description: post.seoDescription ?? null,
    external_media: post.externalMedia ? JSON.stringify(post.externalMedia) : null,
  };
}

export async function listPosts(db: D1Database): Promise<StudioPost[]> {
  const { results } = await db.prepare("SELECT * FROM studio_posts ORDER BY updated_at DESC").all<StudioPostRow>();
  return results.map(rowToPost);
}

export async function getPost(db: D1Database, id: string): Promise<StudioPost | null> {
  const row = await db.prepare("SELECT * FROM studio_posts WHERE id = ?").bind(id).first<StudioPostRow>();
  return row ? rowToPost(row) : null;
}

/** Returns the post that already owns `slug`, if any, excluding
    `excludeId` — used to reject slug collisions before writing. */
export async function findPostBySlug(db: D1Database, slug: string, excludeId?: string): Promise<StudioPost | null> {
  const row = excludeId
    ? await db.prepare("SELECT * FROM studio_posts WHERE slug = ? AND id != ?").bind(slug, excludeId).first<StudioPostRow>()
    : await db.prepare("SELECT * FROM studio_posts WHERE slug = ?").bind(slug).first<StudioPostRow>();
  return row ? rowToPost(row) : null;
}

export async function insertPost(db: D1Database, post: StudioPost): Promise<void> {
  const v = toRowValues(post);
  await db
    .prepare(
      `INSERT INTO studio_posts
       (id, title, slug, excerpt, cover_image, body, category, tags, status, published_at, scheduled_at, created_at, updated_at, seo_title, seo_description, external_media)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      v.id,
      v.title,
      v.slug,
      v.excerpt,
      v.cover_image,
      v.body,
      v.category,
      v.tags,
      v.status,
      v.published_at,
      v.scheduled_at,
      v.created_at,
      v.updated_at,
      v.seo_title,
      v.seo_description,
      v.external_media,
    )
    .run();
}

/**
 * Writes one editorial version only if the row still has the version
 * (`expectedUpdatedAt`) that the caller read. This is an optimistic
 * concurrency guard for multiple admin tabs: a stale save never silently
 * overwrites a newer edit.
 */
export async function updatePost(db: D1Database, post: StudioPost, expectedUpdatedAt: string): Promise<boolean> {
  const v = toRowValues(post);
  const result = await db
    .prepare(
      `UPDATE studio_posts SET
         title = ?, slug = ?, excerpt = ?, cover_image = ?, body = ?, category = ?, tags = ?,
         status = ?, published_at = ?, scheduled_at = ?, updated_at = ?,
         seo_title = ?, seo_description = ?, external_media = ?
       WHERE id = ? AND updated_at = ?`,
    )
    .bind(
      v.title,
      v.slug,
      v.excerpt,
      v.cover_image,
      v.body,
      v.category,
      v.tags,
      v.status,
      v.published_at,
      v.scheduled_at,
      v.updated_at,
      v.seo_title,
      v.seo_description,
      v.external_media,
      v.id,
      expectedUpdatedAt,
    )
    .run();
  return result.meta.changes > 0;
}

/** Delete only the version the caller inspected. If another tab saves
    between read and delete, the row survives and the caller can refresh. */
export async function deletePost(db: D1Database, id: string, expectedUpdatedAt: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM studio_posts WHERE id = ? AND updated_at = ?")
    .bind(id, expectedUpdatedAt)
    .run();
  return result.meta.changes > 0;
}

/** After a successful GitHub commit, records that a public copy exists.
    Deliberately does not overwrite `updated_at`: another tab may have
    saved newer private edits while GitHub was responding, and those edits
    (and their version timestamp) must survive. */
export async function markPublished(
  db: D1Database,
  id: string,
  publishedAt: string,
  commitSha?: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE studio_posts SET status = 'published', published_at = ?, scheduled_at = NULL,
       github_commit_sha = COALESCE(?, github_commit_sha), last_publish_error = NULL WHERE id = ?`,
    )
    .bind(publishedAt, commitSha ?? null, id)
    .run();
  return result.meta.changes > 0;
}

/** After a failed publish attempt, preserves the editorial version and
    records why. A transport failure is not an editorial edit, so it must
    not bump `updated_at` and make the still-open admin form stale. */
export async function recordPublishError(db: D1Database, id: string, error: string): Promise<void> {
  await db.prepare("UPDATE studio_posts SET last_publish_error = ? WHERE id = ?").bind(error, id).run();
}
