# Emma Kwon Website — Release Acceptance

Status: `RC_PENDING_CLOUDFLARE_CAPACITY`

Release candidate prepared on 2026-08-16.

## What this status means

The repository is release-ready, but the current QA 10–19 changes are intentionally not being sent to Cloudflare Pages while the free build quota is constrained. GitHub `Site CI` is verification only and must not be treated as proof of live deployment.

## Current recovery snapshot

The rendered/runtime/recovery baseline for this candidate is:

`8a3403c3c026cc686edf619c0f64a6f5595742f2`

It is recorded as `PRE_RELEASE_RC_SNAPSHOT`, not yet as a live-verified production state. Application rollback rules are in `RELEASE_ROLLBACK.md`; Studio editorial-data recovery rules are in `STUDIO_DATA_RECOVERY.md`.

## Required release gate

Before changing this status to `RELEASED`:

1. Confirm Cloudflare Pages build capacity is available.
2. Confirm the intended release still matches the approved visual direction and content.
3. Run `npm run verify:release` locally, or confirm the latest GitHub `Site CI` is green for the release candidate HEAD. This includes repository secret/config/backup invariants, High/Critical production dependency audit, Cloudflare Functions typecheck, lint, build, and static export integrity.
4. Confirm `RELEASE_ROLLBACK.md` still names the intended recovery snapshot.
5. Confirm Cloudflare Access still protects `/admin`, `/admin/*`, `/api/admin`, and `/api/admin/*`; repository documentation alone is not proof of the live dashboard state.
6. If the release also includes a destructive D1 migration, maintenance query, database-binding change, or other intentional editorial-data risk, stop and create a verified private D1 export first with `npm run backup:studio`, following `STUDIO_DATA_RECOVERY.md`. A normal code/content release does not require an automatic D1 export.
7. Do not make unrelated code or design changes in the release-trigger commit.
8. Change only this file's status from `RC_PENDING_CLOUDFLARE_CAPACITY` to `RELEASED` and commit **without** `[CF-Pages-Skip]`.
9. That single non-skip commit is the intentional Cloudflare Pages deployment trigger.
10. After Cloudflare finishes, visually accept the live site at desktop, intermediate/tablet width, and phone width before calling the release production-locked.
11. While signed in through Cloudflare Access, open `/api/admin/diagnostics` once. Require HTTP 200 with both D1 and GitHub read checks reporting `status: "ok"`.
12. Exercise Studio Admin once after release: load posts and save a harmless draft/edit. Confirm errors, if any, surface a diagnostic `Reference: code / requestId`. Do not use a production publish/delete as a smoke test unless an actual content change is intended.
13. Only after live visual/runtime/diagnostic acceptance may a snapshot be promoted from `PRE_RELEASE_RC_SNAPSHOT` to `PRODUCTION_LKG` in a later `[CF-Pages-Skip]` documentation commit.

## Acceptance coverage already automated

The release verification covers repository secret/configuration/backup invariants, production dependency advisories at High/Critical severity, Cloudflare Pages Functions TypeScript compilation, lint, Next.js production build/static export, required routes/files, internal links and anchors, asset paths, canonical/Open Graph/Twitter metadata, robots/sitemap, public Studio publishing invariants, admin noindex, approved external destinations, safe Studio external-media rendering, and public accessibility invariants including H1/main/lang/image alt/button names/new-window link safety.

QA 17 additionally locks the runtime contracts that static HTML checks cannot prove alone: optimistic version guards for admin mutations, D1 zero-row-write detection, no-change save preservation, idempotent GitHub public-content writes, bounded GitHub/browser requests, no-store Admin API responses, and separate Cloudflare Functions typechecking.

QA 18 adds incident observability without exposing editorial data: server-generated request IDs, stable Admin API error codes, structured safe runtime logs, browser-visible diagnostic references, and a protected read-only `/api/admin/diagnostics` probe for D1 connectivity and authenticated GitHub content reads. Operating procedure is documented in `INCIDENT_DIAGNOSTICS.md`.

QA 19 separates public-content recovery from private-editorial recovery. `src/content/studio-posts.json` remains the Git-backed source for published content only; full D1 exports are private and gitignored; the published-content seed is generated on demand instead of being committed stale; and the repository security check rejects both tracked `.studio-backups/` files and a tracked generated seed. Long-term backup and destructive-recovery operations remain explicit operator actions and are never run by CI.

## Runtime assumptions and boundaries

- The Admin is intentionally single-creator. Same-tab mutations are serialized by the UI and stale multi-tab edits are rejected by `updatedAt` version checks.
- There is no global distributed Publish/Delete lock across separate tabs. Do not expand this Admin to multiple simultaneous editors without first designing and deploying an explicit D1 lock/lease migration.
- Repeating a publish/delete that already matches public GitHub state must remain a no-op so it does not create a needless GitHub commit or Cloudflare build.
- A browser timeout is an uncertain outcome, not proof that the server did nothing. Refresh Admin state before retrying a timed-out mutation.
- Diagnostic logs must never include post bodies, request bodies, tokens, authorization headers, passphrases, D1 row dumps, or environment-variable values.
- `/api/admin/diagnostics` is read-only and incident-driven. It must remain protected by Cloudflare Access and must not become an automatic polling loop.
- `studio-posts.json` and an on-demand published seed are not substitutes for a full D1 backup when private drafts/unpublished edits matter.
- QA 17–19 require no new production D1 migration; the current release candidate remains compatible with the existing `studio_posts` schema.

## Security assumptions that remain external to the repository

- Cloudflare Access is the real authentication boundary for Admin/API. `NEXT_PUBLIC_ADMIN_PASSPHRASE` is client-visible and only a UX deterrent.
- `GITHUB_TOKEN` must remain a Cloudflare Pages Secret and a fine-grained token limited to `k-mama/emmakwon` with Contents read/write only.
- Production D1 binding/configuration lives in the Cloudflare dashboard. The committed `wrangler.local.toml` must keep only its placeholder database ID and must not become production Pages configuration.
- A real `npm run backup:studio` operation requires the operator's local Wrangler authentication/configuration and is intentionally not exercised by GitHub CI.

## Visual acceptance targets

Preserve the approved bright-luxury creative-house direction. In particular: centered desktop Hero; edge-to-edge uncropped mobile Hero; visible language globe; soft squircle media; restrained ambient halo + glass highlight + depth shadow; album covers as a single rounded object with no second backing plate; BORN RARE 3D book mockup outside the global glow/radius treatment; no retired Emma portrait intro.

## Release discipline

If any change is needed after this candidate is prepared, return to `[CF-Pages-Skip]` commits, re-run release verification, and keep this status pending until the next intentional one-build release window.

Never force-push `main` as a rollback method. Production application recovery must preserve history through a new verified rollback commit, following `RELEASE_ROLLBACK.md`. Studio data recovery is a separate decision path and must follow `STUDIO_DATA_RECOVERY.md` rather than being improvised during a code rollback.
