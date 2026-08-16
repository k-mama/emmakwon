// Shared env/binding shape and diagnostics helpers for all admin Pages
// Functions. Leading underscore keeps this out of Cloudflare's file-based
// routing — it's a plain helper module, not a route.
import type { D1Database } from "@cloudflare/workers-types";

export type Env = {
  STUDIO_DB: D1Database;
  // GitHub publishing config — GITHUB_TOKEN must be a Pages secret, never
  // a plain env var. The rest are safe as plain config. See
  // CLOUDFLARE_SETUP.md.
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
  GITHUB_CONTENT_PATH?: string;
};

export type AdminErrorCode =
  | "INVALID_JSON"
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "INVALID_STATE"
  | "VALIDATION_FAILED"
  | "BACKEND_CONFIG_MISSING"
  | "D1_READ_FAILED"
  | "D1_WRITE_FAILED"
  | "D1_DELETE_FAILED"
  | "D1_FINALIZE_FAILED"
  | "GITHUB_PUBLISH_FAILED"
  | "GITHUB_DELETE_FAILED"
  | "DIAGNOSTIC_D1_FAILED"
  | "DIAGNOSTIC_GITHUB_FAILED"
  | "INTERNAL_ERROR";

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function json(data: unknown, init?: ResponseInit, requestId?: string): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(requestId ? { "X-Request-Id": requestId } : {}),
      ...init?.headers,
    },
  });
}

export function errorJson(
  message: string,
  status: number,
  code: AdminErrorCode = "INTERNAL_ERROR",
  requestId?: string,
): Response {
  return json({ error: message, code, requestId }, { status }, requestId);
}

type AdminLogInput = {
  requestId: string;
  code: AdminErrorCode;
  route: string;
  method: string;
  error?: unknown;
  postId?: string;
  level?: "warn" | "error";
};

/**
 * Structured diagnostics only. Never pass request bodies, post content,
 * secrets, tokens, or environment-variable values here. A requestId is the
 * bridge between the safe browser-facing error reference and Cloudflare logs.
 */
export function logAdminIssue(input: AdminLogInput): void {
  const message =
    input.error instanceof Error
      ? input.error.message
      : typeof input.error === "string"
        ? input.error
        : input.error === undefined
          ? undefined
          : "Non-Error failure";

  const payload = JSON.stringify({
    scope: "studio-admin",
    requestId: input.requestId,
    code: input.code,
    route: input.route,
    method: input.method,
    ...(input.postId ? { postId: input.postId } : {}),
    ...(message ? { message } : {}),
  });

  if (input.level === "warn") console.warn(payload);
  else console.error(payload);
}
