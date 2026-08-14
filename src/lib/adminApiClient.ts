// Phase 3 admin data layer: the browser talks ONLY to the Pages
// Functions API (/api/admin/*), which is the only thing with a D1
// binding and the GitHub token. No credentials, no D1 access, and no
// persistence logic live in this file or anywhere in client code.
//
// If these calls fail — most commonly because there's no Cloudflare
// Functions runtime at all (e.g. running under plain `next dev`, or D1
// isn't bound yet in production) — callers must show that honestly
// ("Publishing backend not configured") rather than silently falling
// back to a local save that looks like it worked.
import type { StudioPost } from "@/content/studio";

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new AdminApiError("Publishing backend not configured.", 0);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // No Functions runtime answered with JSON at all — most likely
    // there's no backend here (e.g. plain `next dev`).
    throw new AdminApiError("Publishing backend not configured.", response.status);
  }

  const body = await response.json();
  if (!response.ok) {
    throw new AdminApiError(body?.error ?? "Request failed.", response.status);
  }

  return body as T;
}

export function fetchAllPosts(): Promise<StudioPost[]> {
  return request<{ posts: StudioPost[] }>("/api/admin/posts").then((data) => data.posts);
}

export function fetchPost(id: string): Promise<StudioPost> {
  return request<{ post: StudioPost }>(`/api/admin/posts/${id}`).then((data) => data.post);
}

export function createDraft(initial: Partial<StudioPost> = {}): Promise<StudioPost> {
  return request<{ post: StudioPost }>("/api/admin/posts", {
    method: "POST",
    body: JSON.stringify(initial),
  }).then((data) => data.post);
}

export function savePost(id: string, patch: Partial<StudioPost>): Promise<StudioPost> {
  // A brand-new PostForm intentionally has no persisted id. Its first
  // explicit Save Draft / Publish Now creates the D1 row; merely opening
  // /admin/posts/new must never create a phantom draft.
  if (!id) return createDraft(patch);

  return request<{ post: StudioPost }>(`/api/admin/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then((data) => data.post);
}

export function deletePost(id: string): Promise<void> {
  // Deleting an unsaved New Post is already complete: there is no D1 row.
  if (!id) return Promise.resolve();

  return request(`/api/admin/posts/${id}`, { method: "DELETE" }).then(() => undefined);
}

export function publishPost(id: string): Promise<{ commitSha: string; publishedAt: string }> {
  return request(`/api/admin/posts/${id}/publish`, { method: "POST" });
}
