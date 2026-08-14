// Shared Studio publishing core — used by the "Publish Now" Pages
// Function (functions/api/admin/posts/[id]/publish.ts), the site's only
// publishing path. Publishing is manual only: there is no scheduler or
// standalone Worker in this project's architecture (see
// CLOUDFLARE_SETUP.md). Kept as one plain module with no framework
// imports so it's easy to bundle and reason about in isolation — Pages
// Functions run on the Workers runtime, so the fetch/Web-API surface
// used here is native, not a polyfill.
//
// Deliberately framework-free: no Next.js imports here (this file is
// consumed outside the Next build, by wrangler's own bundler).

// These types intentionally mirror src/content/studio.ts's StudioPost
// rather than importing it: this module's dependency surface is kept
// deliberately minimal (it handles the GitHub token), and the two only
// need to agree on the wire shape, not share code.
export type StudioCategory = "LEARN" | "BUILD" | "MAKE";
export type StudioPostStatus = "draft" | "scheduled" | "published";

export type StudioMediaRef = { label: string; url: string };

export type StudioPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  body: string[];
  category: StudioCategory;
  tags: string[];
  status: StudioPostStatus;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  seoTitle?: string;
  seoDescription?: string;
  externalMedia?: StudioMediaRef[];
};

/** The shape of one row in the D1 studio_posts table (see
    migrations/0001_create_studio_posts.sql) — snake_case columns, JSON
    stored as TEXT. */
export type StudioPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string | null;
  body: string;
  category: string;
  tags: string;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  seo_title: string | null;
  seo_description: string | null;
  external_media: string | null;
  github_commit_sha: string | null;
  last_publish_error: string | null;
};

export function rowToPost(row: StudioPostRow): StudioPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImage: row.cover_image ?? undefined,
    body: JSON.parse(row.body || "[]"),
    category: row.category as StudioCategory,
    tags: JSON.parse(row.tags || "[]"),
    status: row.status as StudioPostStatus,
    publishedAt: row.published_at ?? undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    externalMedia: row.external_media ? JSON.parse(row.external_media) : undefined,
  };
}

/** Strips admin-only bookkeeping fields (github_commit_sha,
    last_publish_error) — those never belong in the public JSON file. */
export function postToPublicJson(post: StudioPost): StudioPost {
  const { id, title, slug, excerpt, coverImage, body, category, tags, publishedAt, seoTitle, seoDescription, externalMedia } =
    post;
  return {
    id,
    title,
    slug,
    excerpt,
    coverImage,
    body,
    category,
    tags,
    status: "published",
    publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    seoTitle,
    seoDescription,
    externalMedia,
  };
}

export type ValidationResult = { valid: true } | { valid: false; errors: string[] };

const CATEGORIES: StudioCategory[] = ["LEARN", "BUILD", "MAKE"];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validatePost(post: StudioPost): ValidationResult {
  const errors: string[] = [];
  if (!post.title.trim()) errors.push("Title is required.");
  if (!post.slug.trim() || !SLUG_PATTERN.test(post.slug)) errors.push("Slug must be lowercase letters, numbers, and hyphens only.");
  if (!post.excerpt.trim()) errors.push("Excerpt is required.");
  if (!post.body.length || post.body.every((paragraph) => !paragraph.trim())) errors.push("Body cannot be empty.");
  if (!CATEGORIES.includes(post.category)) errors.push("Category must be LEARN, BUILD, or MAKE.");
  return errors.length ? { valid: false, errors } : { valid: true };
}

// ---------------------------------------------------------------------
// GitHub content publishing
// ---------------------------------------------------------------------

export type GithubConfig = {
  owner: string;
  repo: string;
  branch: string;
  contentPath: string;
  token: string;
};

export type PublishResult =
  | { ok: true; commitSha: string }
  | { ok: false; error: string };

function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUtf8(input: string): string {
  const binary = atob(input.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "emmakwon-studio-publisher",
  };
}

/** Fetches the current public content file's parsed posts and its git
    blob SHA (required to update the file). */
async function fetchContentFile(
  config: GithubConfig,
  fetchImpl: typeof fetch,
): Promise<{ posts: StudioPost[]; sha: string }> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.contentPath}?ref=${config.branch}`;
  const response = await fetchImpl(url, { headers: githubHeaders(config.token) });

  if (!response.ok) {
    throw new Error(`GitHub read failed (${response.status}): ${await safeErrorText(response)}`);
  }

  const body = (await response.json()) as { content: string; sha: string };
  const posts = JSON.parse(base64ToUtf8(body.content)) as StudioPost[];
  return { posts, sha: body.sha };
}

/** Inserts or updates `post` by id within `posts`. Throws a plain Error
    with a clear message if a DIFFERENT post already owns the same slug —
    callers should surface that as a validation failure, not silently
    overwrite the other post. */
function mergePost(posts: StudioPost[], post: StudioPost): StudioPost[] {
  const slugOwner = posts.find((existing) => existing.slug === post.slug && existing.id !== post.id);
  if (slugOwner) {
    throw new Error(`Slug "${post.slug}" is already used by another published post (${slugOwner.id}).`);
  }

  const index = posts.findIndex((existing) => existing.id === post.id);
  const publicPost = postToPublicJson(post) as StudioPost;

  if (index === -1) return [...posts, publicPost];
  return posts.map((existing, i) => (i === index ? publicPost : existing));
}

async function commitContentFile(
  config: GithubConfig,
  posts: StudioPost[],
  sha: string,
  message: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; commitSha: string } | { ok: false; status: number; error: string }> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.contentPath}`;
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: { ...githubHeaders(config.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(JSON.stringify(posts, null, 2) + "\n"),
      sha,
      branch: config.branch,
    }),
  });

  if (!response.ok) {
    return { ok: false, status: response.status, error: await safeErrorText(response) };
  }

  const result = (await response.json()) as { commit: { sha: string } };
  return { ok: true, commitSha: result.commit.sha };
}

async function safeErrorText(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

/**
 * Publishes one post to the public content file on GitHub: read → merge
 * → write, with a single refresh-and-retry if the file changed between
 * read and write (GitHub rejects the write with a stale sha). Never
 * loops more than once — a second conflict is reported as a failure
 * rather than retried indefinitely, and publication operations should be
 * serialized by the caller (no parallel publishes of the same file).
 */
export async function publishPostToGithub(
  config: GithubConfig,
  post: StudioPost,
  fetchImpl: typeof fetch = fetch,
): Promise<PublishResult> {
  const commitMessage = `Publish Studio note: ${post.title}`;

  try {
    let { posts, sha } = await fetchContentFile(config, fetchImpl);
    let merged = mergePost(posts, post);
    let result = await commitContentFile(config, merged, sha, commitMessage, fetchImpl);

    if (!result.ok && result.status === 409) {
      // File moved under us — refresh once, re-merge, retry once.
      ({ posts, sha } = await fetchContentFile(config, fetchImpl));
      merged = mergePost(posts, post);
      result = await commitContentFile(config, merged, sha, commitMessage, fetchImpl);
    }

    if (!result.ok) {
      return { ok: false, error: `GitHub publish failed (${result.status}): ${result.error}` };
    }

    return { ok: true, commitSha: result.commitSha };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown publish error." };
  }
}
