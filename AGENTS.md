<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Emma Kwon project operating rules

## Release discipline — protect the Cloudflare Pages build quota

- Cloudflare Pages is connected to this repository through Git integration. A normal push to `main` can trigger a Cloudflare build/deployment independently of GitHub Actions.
- The GitHub `Site CI` workflow is verification only. It runs lint/build/static-export checks; CI success must never be described as proof that the live Cloudflare site was deployed or visually verified.
- During iterative work, prefix every commit message with **`[CF-Pages-Skip]`**. This is the default for QA passes, refactors, design tuning, documentation changes, and intermediate fixes.
- Batch related edits into meaningful milestones. Do not consume a Pages build merely to preview or verify one small code change.
- Omit `[CF-Pages-Skip]` only for an intentional release milestone, after the user has approved deployment and Cloudflare build capacity is available.
- Before an intentional release, require a green `Site CI` or equivalent successful local checks: `npm run lint`, `npm run build`, and `npm run check:site`.
- If live deployment status cannot be observed directly, say so. Never infer live state from a GitHub commit, CI result, or expected Cloudflare behavior.

## Release snapshot and rollback discipline

- Read `RELEASE_ACCEPTANCE.md` and `RELEASE_ROLLBACK.md` before an intentional production release or rollback.
- Treat a full Git commit SHA as the immutable recovery reference. Do not create snapshot/preview branches merely for backup while Cloudflare quota is constrained; branch creation may be observed by a Git-integrated Pages project depending on its preview configuration.
- Distinguish `PRE_RELEASE_RC_SNAPSHOT` from `PRODUCTION_LKG`. CI can establish the former; only a completed Cloudflare deployment plus live visual acceptance can establish the latter.
- Never force-push `main`, reset published history, or move `main` backward as a rollback shortcut.
- Restore production through a new auditable rollback commit, run `npm run verify:release`, and only then allow one intentional non-skip Cloudflare deployment.
- During rollback diagnosis/preparation, keep `[CF-Pages-Skip]`. The final verified rollback trigger is the only rollback commit that should omit the skip marker.
- Do not claim rollback success until the live Cloudflare site has been checked after deployment.

## Product and design guardrails

- Preserve the approved bright-luxury creative-house direction: colorful and luminous, never globally greyed or desaturated.
- Media is the protagonist. Keep UI quiet and avoid fake placeholders, empty archives, decorative filler, duplicate assets, or invented commerce/streaming links.
- Mobile is a deliberate simplified composition, not a shrunken desktop. Protect 320–430px layouts and the compact navigation breakpoint at 900px.
- Preserve the centered desktop Hero and the edge-to-edge, uncropped mobile Hero behavior.
- Keep the language globe visible. Expose only languages that actually exist.
- Preserve the approved media depth DNA: soft squircle corners, restrained ambient halo, glass highlight, and low-contrast depth shadow. Effects should make media feel more expensive and alive without reading as neon or game UI.
- Album artwork must read as one object; do not reintroduce a second rounded backing plate behind album covers.
- Keep the BORN RARE 3D book mockup outside the global image-radius/glow treatment so it retains physical object character.
- Do not resurrect the retired Emma intro/portrait panel unless the user explicitly asks for it.

## Public-content and Studio safety

- `src/content/studio-posts.json` is public content and must contain published posts only. Draft/editorial state belongs in D1.
- Publishing state must continue to flow through the explicit Publish Now pipeline; do not create a shortcut that writes drafts directly to public JSON.
- Real `/admin` and `/api/admin` security is expected at Cloudflare Access. The client-side passphrase is only a UX deterrent.
- Do not claim Cloudflare Access is configured merely because this repository documents the intended rules; dashboard state must be verified separately.
- Preserve `robots`/`sitemap`/canonical/Open Graph/Twitter metadata and the static integrity checker. Do not weaken `scripts/check-static-site.mjs` just to make CI green.
