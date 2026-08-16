# Emma Kwon Website — Release Acceptance

Status: `RELEASED — PUBLIC_LIVE_ACCEPTED — AUTHENTICATED_ADMIN_SMOKE_PENDING`

Production release triggered and deployed on 2026-08-16.

## Current production state

The QA 20 release candidate was intentionally released through one non-skip commit:

`beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

Commit message:

`Release production: QA20 release candidate`

Cloudflare Pages reported **Deployed successfully / Deploy successful** for that exact commit. The public production site was then probed from a GitHub-hosted Chrome browser against `https://emmakwon.pages.dev`.

The deployed commit above is the current **PRODUCTION_LKG candidate**, but it is not promoted to `PRODUCTION_LKG` yet because the authenticated Admin smoke test is still pending.

Later `[CF-Pages-Skip]` commits that add or fix the live-acceptance workflow are repository-only validation tooling and did not replace the deployed production application.

## Live public acceptance — passed

The successful Live Acceptance Probe ran from commit:

`6e8c3f850d80fe207a5120c950c9904d0fdcd4d2`

GitHub Actions run:

`31938302014`

The probe used a real headless Chrome session against the production hostname and passed all objective checks below.

### Public routes

HTTP 200 confirmed for:

- `/`
- `/sly-fairy/`
- `/emmaestro/`
- `/k-mama/`
- `/books/`
- `/studio/`
- `/studio/notes/`

Each checked public page rendered:

- exactly one `<h1>`;
- exactly one `<main>`;
- `lang="en"`;
- the expected production canonical URL;
- no horizontal overflow at the audited desktop width.

### Responsive home acceptance

The production homepage was rendered and measured at:

- Desktop: `1440 × 1000`
- Intermediate/tablet: `820 × 1180`
- Mobile: `390 × 844`

All three passed:

- no horizontal overflow;
- exactly one H1;
- visible language globe;
- Hero video present.

Desktop Hero video geometry measured:

- left: `301.390625px`
- width: `837.203125px`
- viewport width: `1440px`

Its center is therefore the exact viewport center.

Intermediate Hero video geometry measured:

- left: `32.796875px`
- width: `754.390625px`
- viewport width: `820px`

It is also horizontally centered.

Mobile Hero video geometry measured:

- left: `0px`
- width: `390px`
- height: `465.828125px`
- viewport width: `390px`

The mobile Hero is edge-to-edge and retains the intended `1080 / 1290` source aspect ratio without the desktop centering treatment being incorrectly shrunk onto mobile.

### SEO live files

Production HTTP 200 confirmed for:

- `/robots.txt`
- `/sitemap.xml`

`robots.txt` disallows `/admin`, and the sitemap contains the required public room routes.

### Cloudflare Access boundary — verified live

Unauthenticated production requests were redirected by Cloudflare Access before reaching the protected Admin/API surface:

- `/admin` → HTTP 302
- `/admin/` → HTTP 302
- `/api/admin` → HTTP 302
- `/api/admin/diagnostics` → HTTP 302

The redirect target was the configured Cloudflare Access login domain. This is live evidence that the Access boundary exists for the four required parent/wildcard surfaces; it is no longer merely a repository assumption.

## Remaining acceptance — authenticated Admin smoke only

The only acceptance items still pending require an authenticated Cloudflare Access session and therefore cannot be truthfully completed by unauthenticated CI or by repository inspection.

Before promoting the deployed commit to `PRODUCTION_LKG`:

1. Sign in through Cloudflare Access.
2. Open `/api/admin/diagnostics`.
3. Require HTTP 200 with both D1 and GitHub read checks reporting `status: "ok"`.
4. Open Studio Admin and confirm the post list loads.
5. Save one harmless draft/edit without publishing or deleting production content merely for testing.
6. If any error appears, confirm it includes `Reference: code / requestId` and follow `INCIDENT_DIAGNOSTICS.md`.

Do not use Publish or Delete as a smoke test unless an actual editorial change is intended.

After these authenticated checks pass, record:

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

in a later `[CF-Pages-Skip]` documentation commit. Do not create another application deployment merely to record the LKG state.

## Current recovery snapshot

The pre-release rendered/runtime/recovery/change-control baseline remains:

`cccad3549f4a3fcb7f46a6893617be091353c630`

That SHA remains a verified rollback baseline for the application tree. The successfully deployed production commit is `beac618e8b7ff5d4a58f0ff567defa14b4d01dee`.

Application rollback rules are in `RELEASE_ROLLBACK.md`; Studio editorial-data recovery rules are in `STUDIO_DATA_RECOVERY.md`.

## Release procedure used

The production release followed the QA 20 change-control contract:

1. Iterative QA work remained `[CF-Pages-Skip]`.
2. The release candidate passed Site CI.
3. Only `RELEASE_ACCEPTANCE.md` was changed in the release-trigger commit.
4. The commit message began `Release production:` and intentionally omitted `[CF-Pages-Skip]`.
5. `scripts/check-deploy-intent.mjs` classified it as an approved production release.
6. GitHub Site CI passed deployment-intent policy, repository security, production dependency audit, Cloudflare Functions typecheck, lint, production build, and static-export verification.
7. Cloudflare Pages deployed the exact release commit successfully.
8. The public production site passed the browser-based Live Acceptance Probe described above.

## Acceptance coverage already automated

Release verification covers repository secret/configuration/backup invariants, production dependency advisories at High/Critical severity, Cloudflare Pages Functions TypeScript compilation, lint, Next.js production build/static export, required routes/files, internal links and anchors, asset paths, canonical/Open Graph/Twitter metadata, robots/sitemap, public Studio publishing invariants, admin noindex, approved external destinations, safe Studio external-media rendering, and public accessibility invariants including H1/main/lang/image alt/button names/new-window link safety.

QA 17 locks the runtime contracts that static HTML checks cannot prove alone: optimistic version guards for admin mutations, D1 zero-row-write detection, no-change save preservation, idempotent GitHub public-content writes, bounded GitHub/browser requests, no-store Admin API responses, and separate Cloudflare Functions typechecking.

QA 18 adds incident observability without exposing editorial data: server-generated request IDs, stable Admin API error codes, structured safe runtime logs, browser-visible diagnostic references, and a protected read-only `/api/admin/diagnostics` probe for D1 connectivity and authenticated GitHub content reads. Operating procedure is documented in `INCIDENT_DIAGNOSTICS.md`.

QA 19 separates public-content recovery from private-editorial recovery. `src/content/studio-posts.json` remains the Git-backed source for published content only; full D1 exports are private and gitignored; the published-content seed is generated on demand instead of being committed stale; and repository security rejects both tracked `.studio-backups/` files and a tracked generated seed.

QA 20 places the site under change control. `CHANGE_CONTROL.md` defines Class 0–4 changes, `scripts/check-deploy-intent.mjs` classifies non-skip pushes to `main`, and Site CI tests allowed Studio publish/remove, intentional application release, accidental non-skip, and rollback cases.

The Live Acceptance Probe adds an external production check without causing another Cloudflare deployment. Its screenshot/report artifact is retained by GitHub Actions for the configured retention window.

## Runtime assumptions and boundaries

- The Admin is intentionally single-creator.
- Same-tab mutations are serialized by the UI and stale multi-tab edits are rejected by `updatedAt` version checks.
- There is no global distributed Publish/Delete lock across separate tabs. Do not expand the Admin to multiple simultaneous editors without first designing and deploying an explicit D1 lock/lease migration.
- Repeating a publish/delete that already matches public GitHub state must remain a no-op so it does not create a needless GitHub commit or Cloudflare build.
- A browser timeout is an uncertain outcome, not proof that the server did nothing. Refresh Admin state before retrying a timed-out mutation.
- Diagnostic logs must never include post bodies, request bodies, tokens, authorization headers, passphrases, D1 row dumps, or environment-variable values.
- `/api/admin/diagnostics` is read-only and incident-driven. It must remain protected by Cloudflare Access and must not become an automatic polling loop.
- `studio-posts.json` and an on-demand published seed are not substitutes for a full D1 backup when private drafts/unpublished edits matter.
- QA 17–20 require no new production D1 migration; the release remains compatible with the existing `studio_posts` schema.

## Security state

Verified live:

- Cloudflare Access blocks unauthenticated access to the four required Admin/API paths.

Still operator-authenticated by nature:

- diagnostics behind Access;
- D1 binding health after authentication;
- authenticated GitHub Contents read through the Functions runtime;
- harmless Admin save.

Repository constraints that remain mandatory:

- `GITHUB_TOKEN` stays a Cloudflare Pages Secret and a fine-grained token limited to `k-mama/emmakwon` with Contents read/write only.
- `NEXT_PUBLIC_ADMIN_PASSPHRASE` remains only a client-visible UX deterrent, never the security boundary.
- Production D1 binding/configuration remains in Cloudflare, not in committed `wrangler.local.toml`.
- Real D1 exports remain private and must never be committed.

## Visual production lock targets

Preserve the approved bright-luxury creative-house direction, including:

- centered desktop Hero;
- edge-to-edge uncropped mobile Hero;
- visible language globe;
- soft squircle media;
- restrained ambient halo + glass highlight + depth shadow;
- album covers as a single rounded object with no second backing plate;
- BORN RARE 3D book mockup outside the global glow/radius treatment;
- no retired Emma portrait intro.

## Post-release discipline

The site is no longer in open-ended rebuild mode.

For any new change:

1. classify it using `CHANGE_CONTROL.md`;
2. use `[CF-Pages-Skip]` for iterative work;
3. run the QA required for that class;
4. create another non-skip release only when a real production application change is intentionally ready.

Never force-push `main` as a rollback method. Production application recovery must preserve history through a new verified rollback commit, following `RELEASE_ROLLBACK.md`. Studio data recovery is a separate decision path and must follow `STUDIO_DATA_RECOVERY.md`.
