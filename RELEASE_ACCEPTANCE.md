# Emma Kwon Website — Release Acceptance

Status: `RC_PENDING_CLOUDFLARE_CAPACITY`

Release candidate prepared on 2026-08-16.

## What this status means

The repository is release-ready, but the current QA 10–16 changes are intentionally not being sent to Cloudflare Pages while the free build quota is constrained. GitHub `Site CI` is verification only and must not be treated as proof of live deployment.

## Current recovery snapshot

The rendered-site baseline for this candidate is:

`d210c5830698b3278246c3cd8ece57d35eec91f0`

It is recorded as `PRE_RELEASE_RC_SNAPSHOT`, not yet as a live-verified production state. Full rollback rules are in `RELEASE_ROLLBACK.md`.

## Required release gate

Before changing this status to `RELEASED`:

1. Confirm Cloudflare Pages build capacity is available.
2. Confirm the intended release still matches the approved visual direction and content.
3. Run `npm run verify:release` locally, or confirm the latest GitHub `Site CI` is green for the release candidate HEAD. This includes repository secret/config checks and a High/Critical production dependency audit.
4. Confirm `RELEASE_ROLLBACK.md` still names the intended recovery snapshot.
5. Confirm Cloudflare Access still protects `/admin`, `/admin/*`, `/api/admin`, and `/api/admin/*`; repository documentation alone is not proof of the live dashboard state.
6. Do not make unrelated code or design changes in the release-trigger commit.
7. Change only this file's status from `RC_PENDING_CLOUDFLARE_CAPACITY` to `RELEASED` and commit **without** `[CF-Pages-Skip]`.
8. That single non-skip commit is the intentional Cloudflare Pages deployment trigger.
9. After Cloudflare finishes, visually accept the live site at desktop, intermediate/tablet width, and phone width before calling the release production-locked.
10. Only after live visual acceptance may a snapshot be promoted from `PRE_RELEASE_RC_SNAPSHOT` to `PRODUCTION_LKG` in a later `[CF-Pages-Skip]` documentation commit.

## Acceptance coverage already automated

The release verification covers repository secret/configuration invariants, production dependency advisories at High/Critical severity, lint, Next.js production build/static export, required routes/files, internal links and anchors, asset paths, canonical/Open Graph/Twitter metadata, robots/sitemap, public Studio publishing invariants, admin noindex, approved external destinations, safe Studio external-media rendering, and public accessibility invariants including H1/main/lang/image alt/button names/new-window link safety.

## Security assumptions that remain external to the repository

- Cloudflare Access is the real authentication boundary for Admin/API. `NEXT_PUBLIC_ADMIN_PASSPHRASE` is client-visible and only a UX deterrent.
- `GITHUB_TOKEN` must remain a Cloudflare Pages Secret and a fine-grained token limited to `k-mama/emmakwon` with Contents read/write only.
- Production D1 binding/configuration lives in the Cloudflare dashboard. The committed `wrangler.local.toml` must keep only its placeholder database ID and must not become production Pages configuration.

## Visual acceptance targets

Preserve the approved bright-luxury creative-house direction. In particular: centered desktop Hero; edge-to-edge uncropped mobile Hero; visible language globe; soft squircle media; restrained ambient halo + glass highlight + depth shadow; album covers as a single rounded object with no second backing plate; BORN RARE 3D book mockup outside the global glow/radius treatment; no retired Emma portrait intro.

## Release discipline

If any change is needed after this candidate is prepared, return to `[CF-Pages-Skip]` commits, re-run release verification, and keep this status pending until the next intentional one-build release window.

Never force-push `main` as a rollback method. Production recovery must preserve history through a new verified rollback commit, following `RELEASE_ROLLBACK.md`.
