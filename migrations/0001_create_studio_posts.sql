-- Phase 3 admin editorial persistence.
--
-- Run with:
--   wrangler d1 execute STUDIO_DB --local  --file=migrations/0001_create_studio_posts.sql
--   wrangler d1 execute STUDIO_DB --remote --file=migrations/0001_create_studio_posts.sql
--
-- This table holds ALL editorial state (drafts, scheduled, published) for
-- the admin. It is private — the public site never queries it. Published
-- posts are mirrored into src/content/studio-posts.json by the publishing
-- pipeline (Pages Function "Publish Now" / the scheduler Worker), which is
-- what the static Cloudflare Pages build actually reads.

CREATE TABLE IF NOT EXISTS studio_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  body TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL CHECK (category IN ('LEARN', 'BUILD', 'MAKE')),
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published')) DEFAULT 'draft',
  published_at TEXT,
  scheduled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  external_media TEXT,
  github_commit_sha TEXT,
  last_publish_error TEXT
);

-- Not UNIQUE: multiple drafts can legitimately start with the same
-- (often empty) slug before Emma fills one in. Slug uniqueness is a
-- *public-file* concern, enforced at publish time by
-- src/lib/studioPublisher.ts's mergePost(), not a D1 constraint.
CREATE INDEX IF NOT EXISTS idx_studio_posts_slug ON studio_posts (slug);
CREATE INDEX IF NOT EXISTS idx_studio_posts_status ON studio_posts (status);
CREATE INDEX IF NOT EXISTS idx_studio_posts_scheduled_at ON studio_posts (scheduled_at);
