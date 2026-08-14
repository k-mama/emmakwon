// Manual verification for workers/studio-scheduler/src/index.ts's
// processDuePosts() — specifically the validatePost() gate added in
// this change. Uses an in-memory fake D1Database (recognizing the exact
// queries studioRepository.ts issues) and a mocked fetch, so this never
// touches real D1 or the real GitHub API.
//
// Run: npx tsx scripts/test-scheduler.mts
import { processDuePosts, type Env } from "../workers/studio-scheduler/src/index";
import type { StudioPostRow } from "../src/lib/studioPublisher";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok:   ${message}`);
  }
}

function makeRow(overrides: Partial<StudioPostRow> = {}): StudioPostRow {
  return {
    id: "row-1",
    title: "A Real Post",
    slug: "a-real-post",
    excerpt: "An excerpt.",
    cover_image: null,
    body: JSON.stringify(["A paragraph."]),
    category: "BUILD",
    tags: "[]",
    status: "scheduled",
    published_at: null,
    scheduled_at: "2020-01-01T00:00:00.000Z",
    created_at: "2020-01-01T00:00:00.000Z",
    updated_at: "2020-01-01T00:00:00.000Z",
    seo_title: null,
    seo_description: null,
    external_media: null,
    github_commit_sha: null,
    last_publish_error: null,
    ...overrides,
  };
}

function createFakeD1(initialRows: StudioPostRow[]) {
  const rows = initialRows.map((row) => ({ ...row }));

  function prepare(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async all<T>() {
        if (sql.includes("WHERE status = 'scheduled' AND scheduled_at <= ?")) {
          const [nowIso] = boundArgs as [string];
          const results = rows
            .filter((row) => row.status === "scheduled" && row.scheduled_at !== null && row.scheduled_at <= nowIso)
            .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1));
          return { results, success: true, meta: {} } as unknown as T;
        }
        throw new Error(`unhandled all(): ${sql}`);
      },
      async first() {
        throw new Error(`unhandled first(): ${sql}`);
      },
      async run() {
        if (sql.startsWith("UPDATE studio_posts SET status = 'published'")) {
          const [publishedAt, commitSha, updatedAt, id] = boundArgs as [string, string, string, string];
          const row = rows.find((candidate) => candidate.id === id);
          if (row) {
            row.status = "published";
            row.published_at = publishedAt;
            row.scheduled_at = null;
            row.github_commit_sha = commitSha;
            row.last_publish_error = null;
            row.updated_at = updatedAt;
          }
          return { success: true, meta: {} };
        }
        if (sql.startsWith("UPDATE studio_posts SET last_publish_error = ?")) {
          const [error, updatedAt, id] = boundArgs as [string, string, string];
          const row = rows.find((candidate) => candidate.id === id);
          if (row) {
            row.last_publish_error = error;
            row.updated_at = updatedAt;
          }
          return { success: true, meta: {} };
        }
        throw new Error(`unhandled run(): ${sql}`);
      },
    };
  }

  return { db: { prepare } as unknown as Env["STUDIO_DB"], rows };
}

const baseEnv: Omit<Env, "STUDIO_DB"> = {
  GITHUB_TOKEN: "test-token",
  GITHUB_OWNER: "k-mama",
  GITHUB_REPO: "emmakwon",
  GITHUB_BRANCH: "main",
  GITHUB_CONTENT_PATH: "src/content/studio-posts.json",
};

// --- 1 & 3: invalid scheduled post is rejected before GitHub, stays scheduled ---
{
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not have been called for an invalid post");
  }) as typeof fetch;

  const { db, rows } = createFakeD1([makeRow({ id: "invalid-1", title: "" })]); // empty title -> invalid
  await processDuePosts({ ...baseEnv, STUDIO_DB: db });

  assert(!fetchCalled, "invalid scheduled post never reaches GitHub (no fetch call)");
  const row = rows[0];
  assert(row.status === "scheduled", "invalid post remains status=scheduled");
  assert(row.scheduled_at === "2020-01-01T00:00:00.000Z", "invalid post's scheduled_at is unchanged");
  assert(!!row.last_publish_error && row.last_publish_error.includes("Cannot publish"), "invalid post gets a useful last_publish_error");

  globalThis.fetch = originalFetch;
}

// --- 2: valid scheduled post proceeds to the publishing backend (GitHub) ---
{
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    // Fail deliberately (bad response) — this test only checks that the
    // valid post *reached* GitHub, not that publishing succeeds.
    return new Response(JSON.stringify({ message: "simulated failure" }), { status: 500 });
  }) as typeof fetch;

  const { db, rows } = createFakeD1([makeRow({ id: "valid-1" })]); // makeRow() defaults are a valid post
  await processDuePosts({ ...baseEnv, STUDIO_DB: db });

  assert(fetchCalled, "valid scheduled post proceeds to the publishing backend (fetch was called)");
  assert(rows[0].status === "scheduled", "valid post that fails at GitHub stays scheduled, not published");

  globalThis.fetch = originalFetch;
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
