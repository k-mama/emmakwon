// Shared env/binding shape for all admin Pages Functions. Leading
// underscore keeps this out of Cloudflare's file-based routing — it's a
// plain helper module, not a route.
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

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...init?.headers,
    },
  });
}

export function errorJson(message: string, status: number): Response {
  return json({ error: message }, { status });
}
