# Emma Kwon Website — Release Acceptance

Status: `RC_PENDING_CLOUDFLARE_CAPACITY`

Release candidate prepared on 2026-08-16.

## What this status means

The repository is release-ready, but the current QA 10–13 changes are intentionally not being sent to Cloudflare Pages while the free build quota is constrained. GitHub `Site CI` is verification only and must not be treated as proof of live deployment.

## Required release gate

Before changing this status to `RELEASED`:

1. Confirm Cloudflare Pages build capacity is available.
2. Confirm the intended release still matches the approved visual direction and content.
3. Run `npm run verify:release` locally, or confirm the latest GitHub `Site CI` is green for the release candidate HEAD.
4. Do not make unrelated code or design changes in the release-trigger commit.
5. Change only this file's status from `RC_PENDING_CLOUDFLARE_CAPACITY` to `RELEASED` and commit **without** `[CF-Pages-Skip]`.
6. That single non-skip commit is the intentional Cloudflare Pages deployment trigger.
7. After Cloudflare finishes, visually accept the live site at desktop, intermediate/tablet width, and phone width before calling the release production-locked.

## Acceptance coverage already automated

The release verification covers lint, Next.js production build/static export, required routes/files, internal links and anchors, asset paths, canonical/Open Graph/Twitter metadata, robots/sitemap, public Studio publishing invariants, admin noindex, and public accessibility invariants including H1/main/lang/image alt/button names/new-window link safety.

## Visual acceptance targets

Preserve the approved bright-luxury creative-house direction. In particular: centered desktop Hero; edge-to-edge uncropped mobile Hero; visible language globe; soft squircle media; restrained ambient halo + glass highlight + depth shadow; album covers as a single rounded object with no second backing plate; BORN RARE 3D book mockup outside the global glow/radius treatment; no retired Emma portrait intro.

## Release discipline

If any change is needed after this candidate is prepared, return to `[CF-Pages-Skip]` commits, re-run release verification, and keep this status pending until the next intentional one-build release window.
