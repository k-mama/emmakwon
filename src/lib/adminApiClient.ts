// Phase 3 admin data layer: the browser talks ONLY to the Pages
// Functions API (/api/admin/*), which is the only thing with a D1
// binding and the GitHub token. No credentials, no D1 access, and no
// persistence logic live in this file or anywhere in client code.
//
// If these calls fail — most commonly because there's no Cloudflare
// Functions runtime at all (e.g. running under plain `next dev`, or D1
// isn't bound yet in production) — callers must show that honestly
// rather than silently falling back to a local save that looks like it worked.
import type { StudioPost } from "@/content/studio";

const REQUEST_TIMEOUT_MS = 30_000;

export class AdminApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    const reference = requestId
      ? ` Reference: ${code ?? "API_ERROR"} / ${requestId}`
      : code
        ? ` Reference: ${code}`
        : "";
    super(`${message}${reference}`);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    if (controller.signal.aborted) {
      throw new AdminApiError(
        "The admin request timed out. The server may still have completed the operation, so refresh before retrying it.",
        408,
        "CLIENT_TIMEOUT",
      );
    }
    throw new AdminApiError("Publishing backend not configured or temporarily unreachable.", 0, "NETWORK_UNREACHABLE");
  } finally {
    clearTimeout(timeout);
  }

  const headerRequestId = response.headers.get("x-request-id") ?? undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AdminApiError("Publishing backend returned an unexpected response.", response.status, "INVALID_RESPONSE", headerRequestId);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AdminApiError("Publishing backend returned invalid JSON.", response.status, "INVALID_RESPONSE", headerRequestId);
  }

  if (!response.ok) {
    const objectBody = body && typeof body === "object" ? (body as Record<string, unknown>) : undefined;
    const message = typeof objectBody?.error === "string" ? objectBody.error : "Request failed.";
    const code = typeof objectBody?.code === "string" ? objectBody.code : "API_ERROR";
    const requestId = typeof objectBody?.requestId === "string" ? objectBody.requestId : headerRequestId;
    throw new AdminApiError(message, response.status, code, requestId);
  }

  return body as T;
}

function postPath(id: string): string {
  return `/api/admin/posts/${encodeURIComponent(id)}`;
}

export function fetchAllPosts(): Promise<StudioPost[]> {
  return request<{ posts: StudioPost[] }>("/api/admin/posts").then((data) => data.posts);
}

export function fetchPost(id: string): Promise<StudioPost> {
  return request<{ post: StudioPost }>(postPath(id)).then((data) => data.post);
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

  return request<{ post: StudioPost }>(postPath(id), {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then((data) => data.post);
}

export function deletePost(id: string, expectedUpdatedAt?: string): Promise<void> {
  if (!id) return Promise.resolve();

  return request(postPath(id), {
    method: "DELETE",
    body: JSON.stringify({ expectedUpdatedAt }),
  }).then(() => undefined);
}

export function publishPost(
  id: string,
  expectedUpdatedAt?: string,
): Promise<{ commitSha: string | null; publishedAt: string; unchanged: boolean }> {
  return request(`${postPath(id)}/publish`, {
    method: "POST",
    body: JSON.stringify({ expectedUpdatedAt }),
  });
}

export type AdminDiagnostics = {
  ok: boolean;
  requestId: string;
  checks: {
    d1: { status: "ok" | "failed" | "misconfigured"; reason?: string; missing?: string[]; httpStatus?: number };
    githubRead: { status: "ok" | "failed" | "misconfigured"; reason?: string; missing?: string[]; httpStatus?: number };
  };
};

export function fetchAdminDiagnostics(): Promise<AdminDiagnostics> {
  return request<AdminDiagnostics>("/api/admin/diagnostics");
}
