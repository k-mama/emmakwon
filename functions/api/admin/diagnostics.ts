import type { PagesFunction } from "@cloudflare/workers-types";
import { json, logAdminIssue, newRequestId, type Env } from "../../_shared/env";

const ROUTE = "/api/admin/diagnostics";
const GITHUB_TIMEOUT_MS = 10_000;

const GITHUB_CONFIG_KEYS = [
  "GITHUB_TOKEN",
  "GITHUB_OWNER",
  "GITHUB_REPO",
  "GITHUB_BRANCH",
  "GITHUB_CONTENT_PATH",
] as const;

type DiagnosticCheck =
  | { status: "ok" }
  | { status: "failed"; reason: string; httpStatus?: number }
  | { status: "misconfigured"; missing: string[] };

async function checkGithubRead(env: Env): Promise<DiagnosticCheck> {
  const missing = GITHUB_CONFIG_KEYS.filter((key) => !env[key]);
  if (missing.length) return { status: "misconfigured", missing: [...missing] };

  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${env.GITHUB_CONTENT_PATH}?ref=${env.GITHUB_BRANCH}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "emmakwon-studio-diagnostics",
      },
    });

    if (!response.ok) {
      return { status: "failed", reason: "GitHub publishing content could not be read.", httpStatus: response.status };
    }

    return { status: "ok" };
  } catch (error) {
    if (controller.signal.aborted) {
      return { status: "failed", reason: `GitHub read check timed out after ${GITHUB_TIMEOUT_MS / 1000} seconds.` };
    }
    return { status: "failed", reason: error instanceof Error ? error.message : "GitHub read check failed." };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Protected, read-only incident probe. Cloudflare Access must guard
 * /api/admin/* in production. This endpoint returns health categories only;
 * it never returns token values, post bodies, D1 rows, or environment values.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const requestId = newRequestId();

  let d1: DiagnosticCheck;
  try {
    await context.env.STUDIO_DB.prepare("SELECT 1 AS ok").first();
    d1 = { status: "ok" };
  } catch (error) {
    d1 = { status: "failed", reason: "D1 query failed." };
    logAdminIssue({ requestId, code: "DIAGNOSTIC_D1_FAILED", route: ROUTE, method: "GET", error });
  }

  const github = await checkGithubRead(context.env);
  if (github.status !== "ok") {
    logAdminIssue({
      requestId,
      code: github.status === "misconfigured" ? "BACKEND_CONFIG_MISSING" : "DIAGNOSTIC_GITHUB_FAILED",
      route: ROUTE,
      method: "GET",
      error: github.status === "failed" ? github.reason : `Missing configuration: ${github.missing.join(", ")}`,
      level: github.status === "misconfigured" ? "warn" : "error",
    });
  }

  const ok = d1.status === "ok" && github.status === "ok";
  return json(
    {
      ok,
      requestId,
      checks: {
        d1,
        githubRead: github,
      },
    },
    { status: ok ? 200 : 503 },
    requestId,
  );
};
