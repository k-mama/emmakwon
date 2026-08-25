<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Emma Kwon project operating rules

## Production lock and change control

- Read `CHANGE_CONTROL.md` before changing this repository after QA 20. The site is `POST_RELEASE_LOCKED`, not open-ended redesign mode.
- Classify work by impact before editing: Class 0 Studio editorial publishing; Class 1 low-risk content/media maintenance; Class 2 UI/layout/navigation/SEO/routes; Class 3 runtime/security/dependencies/Functions/D1/deployment architecture; Class 4 emergency recovery.
- Do not make speculative design refinements after QA 20. Reopen approved visual systems only for an explicit user request, a concrete defect, a security/platform requirement, or a feature that genuinely needs structural change.
- `scripts/check-deploy-intent.mjs` is a second-line policy gate for pushes to `main`. Do not weaken it to make an accidental non-skip commit pass.
- Approved non-skip `main` commits are limited to: Studio Publish/Remove commits that change only `src/content/studio-posts.json`; `Release production:` commits that change only `RELEASE_ACCEPTANCE.md` to `RELEASED`; and explicit `Rollback production to verified snapshot ...` recovery commits.
- The deploy-intent CI gate cannot undo Cloudflare quota already consumed after a mistaken push. `[CF-Pages-Skip]` remains the primary build-quota protection for iterative work.

## Release discipline — protect the Cloudflare Pages build quota

- Cloudflare Pages is connected to this repository through Git integration. A normal push to `main` can trigger a Cloudflare build/deployment independently of GitHub Actions.
- The GitHub `Site CI` workflow is verification only. It runs deploy-intent policy, repository-security, production-dependency-audit, Cloudflare Functions typecheck, lint, build, and static-export checks; CI success must never be described as proof that the live Cloudflare site was deployed or visually verified.
- During iterative work, prefix every commit message with **`[CF-Pages-Skip]`**. This is the default for QA passes, refactors, design tuning, documentation changes, and intermediate fixes.
- Batch related edits into meaningful milestones. Do not consume a Pages build merely to preview or verify one small code change.
- Omit `[CF-Pages-Skip]` only for an approved deployment-intent commit defined in `CHANGE_CONTROL.md`, after the relevant release/runtime conditions are satisfied.
- Before an intentional application release, require a green `Site CI` or run `npm run verify:release`. Do not bypass security, dependency-audit, or Functions-typecheck stages just to ship.
- If live deployment status cannot be observed directly, say so. Never infer live state from a GitHub commit, CI result, or expected Cloudflare behavior.

## Release snapshot and rollback discipline

- Read `RELEASE_ACCEPTANCE.md` and `RELEASE_ROLLBACK.md` before an intentional production release or rollback.
- Treat a full Git commit SHA as the immutable recovery reference. Do not create snapshot/preview branches merely for backup while Cloudflare quota is constrained; branch creation may be observed by a Git-integrated Pages project depending on its preview configuration.
- Distinguish `PRE_RELEASE_RC_SNAPSHOT` from `PRODUCTION_LKG`. CI can establish the former; only a completed Cloudflare deployment plus live acceptance appropriate to the change can establish the latter.
- Never force-push `main`, reset published history, or move `main` backward as a rollback shortcut.
- Restore production through a new auditable rollback commit, run `npm run verify:release`, and only then allow one intentional non-skip Cloudflare deployment.
- During rollback diagnosis/preparation, keep `[CF-Pages-Skip]`. The final verified rollback trigger is the only rollback commit that should omit the skip marker.
- Do not claim rollback success until the live Cloudflare site has been checked after deployment.

## Dependency, secret, and configuration safety

- `npm run verify:release` must keep the repository-security check, production dependency audit, and Cloudflare Functions typecheck. Do not remove or weaken them merely to make CI green.
- Never commit `.env*`, `.dev.vars*`, `.wrangler/`, private-key files, GitHub PATs, or production D1 identifiers.
- `wrangler.local.toml` is a committed local template only. Its `database_id` must remain `REPLACE_WITH_REAL_D1_DATABASE_ID`, and it must never gain `pages_build_output_dir`.
- Do not add a production root `wrangler.toml` unless the deployment architecture is deliberately redesigned. Production Pages bindings currently live in the Cloudflare dashboard.
- `GITHUB_TOKEN` must remain a Cloudflare Pages Secret. Keep the token fine-grained to `k-mama/emmakwon` with Contents read/write only; do not grant Workflows permission.
- The retired `NEXT_PUBLIC_ADMIN_PASSPHRASE` gate must not be reintroduced. Any `NEXT_PUBLIC_*` value is client-visible and cannot be authentication. Cloudflare Access is the sole authentication boundary for `/admin` and `/api/admin`.
- Public Studio external-media links must be sanitized to ordinary `http:` or `https:` URLs before publishing and again before rendering. Do not permit executable/custom URL schemes.

## Studio runtime resilience

- Keep `npm run check:functions` in both `verify:release` and GitHub `Site CI`. Next.js build success alone is not proof that Pages Functions compile.
- Admin Save/Publish/Delete operations are version-aware. Preserve the `updatedAt` optimistic-concurrency contract: stale tabs must receive a conflict instead of overwriting or deleting newer work.
- D1 `UPDATE` and `DELETE` operations must continue checking `D1Result.meta.changes`; a zero-row write is not success.
- A no-change editorial save must not bump `updatedAt`. This is required so repeated Publish Now can recognize already-current public content.
- Publishing/removing a Studio note is idempotent at the GitHub content-file layer. If the desired public JSON already exists (or is already absent for Delete), do not create another GitHub commit or unnecessary Cloudflare build.
- GitHub API calls are deliberately bounded by a timeout, and browser Admin API calls are also bounded. Do not restore indefinite waits. A client timeout must be treated as an uncertain outcome: tell the editor to refresh before retrying because the server-side operation may have completed.
- Publish finalization may update publication bookkeeping, but must not overwrite `updatedAt` or newer private editorial fields that were saved while GitHub was responding.
- Admin JSON responses must remain `Cache-Control: no-store`.
- The current architecture is intentionally single-creator. Same-tab mutations are serialized by the UI and stale multi-tab edits are guarded by versions, but there is no global distributed operation lock. Do not broaden Admin to multiple simultaneous editors or promise full cross-tab Publish/Delete serialization without first adding and deploying an explicit D1 lock/lease migration.

## Observability and incident diagnostics

- Read `INCIDENT_DIAGNOSTICS.md` before changing Admin error handling or diagnosing a production incident.
- Admin API errors must keep a stable machine-readable `code` plus a server-generated `requestId`; responses should also expose the same id as `X-Request-Id` so browser errors can be correlated with Cloudflare logs.
- Keep Cloudflare runtime logs structured and minimal: request id, error code, route, method, optional post id, and a short internal error message only. Never log request bodies, post text, D1 row dumps, tokens, passphrases, authorization headers, or environment values.
- Expected concurrency conflicts should remain distinguishable from infrastructure failures. `VERSION_CONFLICT` is an expected warning-class condition, not a generic 500.
- Preserve the protected, read-only `/api/admin/diagnostics` endpoint. It may test D1 connectivity and read the configured GitHub content file, but must never mutate either system or return secret values/post content.
- Do not add automatic polling of `/api/admin/diagnostics` to the Admin UI. Diagnostics are incident-driven, not a background health-check loop.
- `D1_FINALIZE_FAILED` and client timeouts after Publish are uncertain-side-effect states. The operating rule is refresh/inspect before retry, never repeated blind clicks.
- Do not remove diagnostic references from Admin errors merely for cosmetic cleanliness; they are the support bridge between the editor screen and runtime logs.

## Studio data backup and recovery

- Read `STUDIO_DATA_RECOVERY.md` before any D1 restore, import, binding replacement, destructive maintenance query, or attempt to rebuild Studio editorial data.
- `src/content/studio-posts.json` is the durable Git-backed source for **published public content only**. It is not a backup of drafts or unpublished edits.
- Full D1 exports can contain private drafts/editorial material. Keep `.studio-backups/` private and outside Git; the repository security check must continue rejecting tracked backup files.
- `migrations/0002_seed_published_posts.sql` is an on-demand generated artifact and must remain gitignored. Generate it with `npm run prepare:studio-seed` from the exact Git revision whose public content is intended for recovery. Do not reintroduce a committed seed file.
- A published-content seed is not a general D1 repair tool. It can overwrite newer unpublished edits on already-published rows and cannot recreate D1-only drafts. Prefer D1 Time Travel or a verified full D1 SQL export when private editorial state matters.
- `npm run backup:studio` is an explicit operator action against remote D1; never run it automatically in CI, page requests, or background polling. It writes a private SQL export plus SHA-256 checksum and manifest into `.studio-backups/`.
- Verify long-term backup files with `npm run verify:studio-backup -- <backup.sql>` before trusting them. A checksum mismatch means do not restore.
- Time Travel restore and SQL import are destructive production actions. Never trigger them automatically from application code, CI, or an agent without an explicit incident decision and a confirmed target point/state.
- Before any real restore, preserve the current state if readable, record the current Time Travel bookmark when applicable, and verify the intended recovery point. After recovery, re-check Cloudflare Access, `/api/admin/diagnostics`, Admin read/save behavior, and public Studio pages before declaring success.

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
- Real `/admin` and `/api/admin` security is Cloudflare Access. Do not add a client-side passphrase gate or treat browser-visible values as authentication.
- Do not claim Cloudflare Access is configured merely because this repository documents the intended rules; live/dashboard state must be verified when relevant. The email-only Admin release was live-accepted on 2026-08-25, but future Access changes still require fresh verification.
- Preserve `robots`/`sitemap`/canonical/Open Graph/Twitter metadata and the static integrity checker. Do not weaken `scripts/check-static-site.mjs` just to make CI green.
