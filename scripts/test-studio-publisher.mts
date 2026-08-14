// Manual verification for src/lib/studioPublisher.ts — exercises
// validation, new-post merge, existing-post merge, slug-conflict
// rejection, the GitHub 409-conflict retry path, and published-post
// removal, all against a mocked fetch. Never touches the real GitHub
// API or real content.
//
// Run: npx tsx scripts/test-studio-publisher.mts
import { publishPostToGithub, removePostFromGithub, validatePost, type StudioPost } from "../src/lib/studioPublisher";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok:   ${message}`);
  }
}

function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function makePost(overrides: Partial<StudioPost> = {}): StudioPost {
  const now = new Date().toISOString();
  return {
    id: "test-id",
    title: "Test Post",
    slug: "test-post",
    excerpt: "An excerpt.",
    body: ["A paragraph."],
    category: "BUILD",
    tags: [],
    status: "published",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// --- validatePost ---------------------------------------------------
assert(validatePost(makePost()).valid === true, "valid post passes validation");
assert(validatePost(makePost({ title: "" })).valid === false, "empty title fails validation");
assert(validatePost(makePost({ slug: "Not A Slug!" })).valid === false, "bad slug fails validation");
assert(validatePost(makePost({ body: [] })).valid === false, "empty body fails validation");

// --- new-post merge, straightforward commit --------------------------
{
  const existingPosts: StudioPost[] = [makePost({ id: "other", slug: "other-post" })];
  let putCalls = 0;

  const mockFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (!init || init.method === undefined) {
      // GET content file
      return new Response(
        JSON.stringify({ content: utf8ToBase64(JSON.stringify(existingPosts)), sha: "sha-1" }),
        { status: 200 },
      );
    }
    if (init.method === "PUT") {
      putCalls++;
      const body = JSON.parse(String(init.body));
      assert(body.sha === "sha-1", "PUT uses the sha read from GET");
      return new Response(JSON.stringify({ commit: { sha: "commit-abc" } }), { status: 200 });
    }
    throw new Error(`Unexpected request to ${url}`);
  };

  const result = await publishPostToGithub(
    { owner: "k-mama", repo: "emmakwon", branch: "main", contentPath: "x.json", token: "x" },
    makePost({ id: "new-post", slug: "new-post" }),
    mockFetch,
  );

  assert(result.ok === true && result.commitSha === "commit-abc", "new-post publish succeeds with correct commit sha");
  assert(putCalls === 1, "no retry needed when there's no conflict");
}

// --- existing-post merge (update in place, no duplicate) -------------
{
  const existingPosts: StudioPost[] = [makePost({ id: "existing", slug: "existing-post", title: "Old title" })];

  const mockFetch: typeof fetch = async (input, init) => {
    if (!init || init.method === undefined) {
      return new Response(JSON.stringify({ content: utf8ToBase64(JSON.stringify(existingPosts)), sha: "sha-1" }), {
        status: 200,
      });
    }
    if (init.method === "PUT") {
      const body = JSON.parse(String(init.body));
      const written = JSON.parse(Buffer.from(body.content, "base64").toString("utf8")) as StudioPost[];
      assert(written.length === 1, "updating an existing post does not create a duplicate row");
      assert(written[0].title === "New title", "updating an existing post overwrites its fields in place");
      return new Response(JSON.stringify({ commit: { sha: "commit-def" } }), { status: 200 });
    }
    throw new Error("unexpected");
  };

  const result = await publishPostToGithub(
    { owner: "k-mama", repo: "emmakwon", branch: "main", contentPath: "x.json", token: "x" },
    makePost({ id: "existing", slug: "existing-post", title: "New title" }),
    mockFetch,
  );
  assert(result.ok === true, "existing-post publish succeeds");
}

// --- slug conflict between two different ids --------------------------
{
  const existingPosts: StudioPost[] = [makePost({ id: "other-id", slug: "shared-slug" })];
  const mockFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ content: utf8ToBase64(JSON.stringify(existingPosts)), sha: "sha-1" }), { status: 200 });

  const result = await publishPostToGithub(
    { owner: "k-mama", repo: "emmakwon", branch: "main", contentPath: "x.json", token: "x" },
    makePost({ id: "new-id", slug: "shared-slug" }),
    mockFetch,
  );
  assert(result.ok === false, "publishing a slug owned by a different post id fails");
  assert(!result.ok && result.error.includes("already used"), "slug conflict error message is clear");
}

// --- GitHub 409 conflict: refresh once, retry once, then succeed -----
{
  let getCalls = 0;
  let putCalls = 0;
  const mockFetch: typeof fetch = async (input, init) => {
    if (!init || init.method === undefined) {
      getCalls++;
      const sha = getCalls === 1 ? "sha-stale" : "sha-fresh";
      return new Response(JSON.stringify({ content: utf8ToBase64(JSON.stringify([])), sha }), { status: 200 });
    }
    if (init.method === "PUT") {
      putCalls++;
      if (putCalls === 1) return new Response(JSON.stringify({ message: "sha mismatch" }), { status: 409 });
      const body = JSON.parse(String(init.body));
      assert(body.sha === "sha-fresh", "retry uses the freshly re-fetched sha");
      return new Response(JSON.stringify({ commit: { sha: "commit-retry" } }), { status: 200 });
    }
    throw new Error("unexpected");
  };

  const result = await publishPostToGithub(
    { owner: "k-mama", repo: "emmakwon", branch: "main", contentPath: "x.json", token: "x" },
    makePost({ id: "retry-post", slug: "retry-post" }),
    mockFetch,
  );

  assert(getCalls === 2, "conflict triggers exactly one refresh (GET called twice total)");
  assert(putCalls === 2, "conflict triggers exactly one retry (PUT called twice total)");
  assert(result.ok === true && result.commitSha === "commit-retry", "publish succeeds after one retry");
}

// --- GitHub conflict twice: fails cleanly, no infinite loop -----------
{
  let putCalls = 0;
  const mockFetch: typeof fetch = async (input, init) => {
    if (!init || init.method === undefined) {
      return new Response(JSON.stringify({ content: utf8ToBase64(JSON.stringify([])), sha: "sha-x" }), { status: 200 });
    }
    if (init.method === "PUT") {
      putCalls++;
      return new Response(JSON.stringify({ message: "sha mismatch" }), { status: 409 });
    }
    throw new Error("unexpected");
  };

  const result = await publishPostToGithub(
    { owner: "k-mama", repo: "emmakwon", branch: "main", contentPath: "x.json", token: "x" },
    makePost({ id: "double-conflict", slug: "double-conflict" }),
    mockFetch,
  );

  assert(putCalls === 2, "a second conflict does not trigger a second retry (bounded at one retry)");
  assert(result.ok === false, "repeated conflict is reported as a failure, not silently swallowed");
}

// --- removePostFromGithub: removes the deleted post, keeps the rest ----
{
  const existingPosts: StudioPost[] = [
    makePost({ id: "keep-me", slug: "keep-me" }),
    makePost({ id: "delete-me", slug: "delete-me" }),
  ];
  let putCalls = 0;

  const mockFetch: typeof fetch = async (input, init) => {
    if (!init || init.method === undefined) {
      return new Response(JSON.stringify({ content: utf8ToBase64(JSON.stringify(existingPosts)), sha: "sha-1" }), {
        status: 200,
      });
    }
    if (init.method === "PUT") {
      putCalls++;
      const body = JSON.parse(String(init.body));
      const written = JSON.parse(Buffer.from(body.content, "base64").toString("utf8")) as StudioPost[];
      assert(written.length === 1, "removal drops only the deleted post");
      assert(written[0].id === "keep-me", "removal leaves the other published post intact");
      return new Response(JSON.stringify({ commit: { sha: "commit-removed" } }), { status: 200 });
    }
    throw new Error("unexpected");
  };

  const result = await removePostFromGithub(
    { owner: "k-mama", repo: "emmakwon", branch: "main", contentPath: "x.json", token: "x" },
    "delete-me",
    "Delete Me",
    mockFetch,
  );
  assert(result.ok === true, "removing a published post succeeds");
  assert(putCalls === 1, "removal writes exactly once when there's no conflict");
}

// --- removePostFromGithub: post already absent is a no-op success -----
{
  const existingPosts: StudioPost[] = [makePost({ id: "still-here", slug: "still-here" })];
  let putCalls = 0;

  const mockFetch: typeof fetch = async (input, init) => {
    if (!init || init.method === undefined) {
      return new Response(JSON.stringify({ content: utf8ToBase64(JSON.stringify(existingPosts)), sha: "sha-1" }), {
        status: 200,
      });
    }
    if (init.method === "PUT") {
      putCalls++;
      throw new Error("should not write when the post is already absent");
    }
    throw new Error("unexpected");
  };

  const result = await removePostFromGithub(
    { owner: "k-mama", repo: "emmakwon", branch: "main", contentPath: "x.json", token: "x" },
    "already-gone",
    "Already Gone",
    mockFetch,
  );
  assert(result.ok === true, "removing an already-absent post is a no-op success");
  assert(putCalls === 0, "no commit is made when there was nothing to remove");
}

// --- removePostFromGithub: 409 conflict retries once, then succeeds ---
{
  let getCalls = 0;
  let putCalls = 0;
  const postToRemove = makePost({ id: "conflict-remove", slug: "conflict-remove" });

  const mockFetch: typeof fetch = async (input, init) => {
    if (!init || init.method === undefined) {
      getCalls++;
      const sha = getCalls === 1 ? "sha-stale" : "sha-fresh";
      return new Response(JSON.stringify({ content: utf8ToBase64(JSON.stringify([postToRemove])), sha }), {
        status: 200,
      });
    }
    if (init.method === "PUT") {
      putCalls++;
      if (putCalls === 1) return new Response(JSON.stringify({ message: "sha mismatch" }), { status: 409 });
      const body = JSON.parse(String(init.body));
      assert(body.sha === "sha-fresh", "removal retry uses the freshly re-fetched sha");
      return new Response(JSON.stringify({ commit: { sha: "commit-remove-retry" } }), { status: 200 });
    }
    throw new Error("unexpected");
  };

  const result = await removePostFromGithub(
    { owner: "k-mama", repo: "emmakwon", branch: "main", contentPath: "x.json", token: "x" },
    "conflict-remove",
    "Conflict Remove",
    mockFetch,
  );
  assert(getCalls === 2, "removal conflict triggers exactly one refresh");
  assert(result.ok === true && result.commitSha === "commit-remove-retry", "removal succeeds after one retry");
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
