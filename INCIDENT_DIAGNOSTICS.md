# Emma Kwon Studio — Incident Diagnostics

This playbook is for the protected Studio Admin / Pages Functions runtime.
It is deliberately narrow: diagnose the layer that failed without exposing
post content, D1 rows, GitHub tokens, or environment-variable values.

## First response

When Admin shows an API error, copy the full diagnostic reference at the end:

`Reference: ERROR_CODE / requestId`

The `requestId` is generated inside the Pages Function and is also returned in
`X-Request-Id`. Search Cloudflare Functions/Pages logs for that exact id.
Structured runtime logs use one JSON object per incident with:

- `scope: studio-admin`
- `requestId`
- `code`
- `route`
- `method`
- optional `postId`
- a short internal error message

Never add request bodies, post text, secrets, token values, or environment
values to these logs.

## Read-only diagnostics endpoint

While signed in through Cloudflare Access, open:

`/api/admin/diagnostics`

It performs only read checks:

1. D1: `SELECT 1`
2. GitHub publishing config: confirms all required variables exist
3. GitHub: authenticated read of the configured public Studio content file

It never writes to D1 or GitHub and never returns secret values or post data.
A healthy result has HTTP 200 and:

```json
{
  "ok": true,
  "checks": {
    "d1": { "status": "ok" },
    "githubRead": { "status": "ok" }
  }
}
```

A failed diagnostic returns HTTP 503 with the failing category and its own
`requestId`.

## Error-code map

- `INVALID_JSON` — malformed/non-object API request body. Client/request issue.
- `NOT_FOUND` — requested D1 post does not exist.
- `VERSION_CONFLICT` — stale admin tab or concurrent mutation. Refresh before retrying.
- `INVALID_STATE` — attempted retired/forbidden state transition.
- `VALIDATION_FAILED` — content is not publishable yet (title/slug/excerpt/body/category rules).
- `BACKEND_CONFIG_MISSING` — required GitHub publishing binding/secret is absent.
- `D1_READ_FAILED` — D1 binding/query/read problem.
- `D1_WRITE_FAILED` — D1 create/update or error-recording problem.
- `D1_DELETE_FAILED` — D1 delete could not finish.
- `D1_FINALIZE_FAILED` — GitHub may already be public, but D1 could not record the publish result. Refresh before any retry.
- `GITHUB_PUBLISH_FAILED` — GitHub read/write/timeout/conflict retry ultimately failed during publish.
- `GITHUB_DELETE_FAILED` — GitHub public-copy removal failed; public article should be treated as still live.
- `DIAGNOSTIC_D1_FAILED` — diagnostics probe could not query D1.
- `DIAGNOSTIC_GITHUB_FAILED` — diagnostics probe could not read the configured GitHub content file.
- `CLIENT_TIMEOUT` — browser stopped waiting after 30 seconds. Outcome is uncertain; refresh before retrying a mutation.
- `NETWORK_UNREACHABLE` — browser could not reach the Functions backend.
- `INVALID_RESPONSE` — backend/proxy returned something other than the expected JSON API contract.

## Incident decision tree

### VERSION_CONFLICT

Do not keep clicking. Refresh/reopen the post, confirm which edit is newest, then
save/publish/delete intentionally.

### D1_* failure

1. Open `/api/admin/diagnostics`.
2. If `d1.status != ok`, inspect Pages Functions logs and the production
   `STUDIO_DB` binding in Cloudflare.
3. Do not modify GitHub public JSON manually just to bypass D1.

### GITHUB_* failure

1. Open `/api/admin/diagnostics`.
2. If `githubRead.status == misconfigured`, inspect the Pages project bindings;
   do not paste the token into chat/logs/source code.
3. If `githubRead.status == failed`, use its HTTP status plus the requestId to
   distinguish token/repository/path/API problems.
4. Keep the fine-grained token limited to this repository with Contents
   read/write only.

### D1_FINALIZE_FAILED or CLIENT_TIMEOUT after Publish

The public GitHub commit may already exist. This is an uncertain side-effect
state. Refresh Admin and inspect the public content state before pressing
Publish again. Idempotent publishing prevents an extra GitHub commit if the
public JSON already matches, but refresh-first remains the operating rule.

### Delete failure after a published post

If GitHub deletion failed, assume the public post is still live. If GitHub
removal succeeded but final D1 deletion hit a version conflict, refresh the
row and use Publish Now first if the public copy needs restoring before any
new delete decision.

## What not to do during an incident

- Do not disable Cloudflare Access.
- Do not expose or rotate a token merely because an error message exists;
  diagnose first.
- Do not force-push `main`.
- Do not manually write drafts into `src/content/studio-posts.json`.
- Do not retry Publish/Delete repeatedly after a timeout.
- Do not log post bodies, request bodies, secrets, passphrases, D1 row dumps,
  or GitHub authorization headers.

## Release boundary

GitHub CI proves compile/static/runtime contracts only. It does not prove the
live Cloudflare bindings or Access rules. After an intentional release, the
release acceptance check should include one read-only diagnostics request and
a harmless Admin load/save check before promoting the release to
`PRODUCTION_LKG`.
