# Emma Kwon Website — Release Acceptance

Status: `RELEASED`

Release phase: `AWAITING LIVE ACCEPTANCE`

An intentional production release for the K-MAMA English alignment is now authorized on 2026-08-23 after the repository release gate passed. The previous live-verified production LKG remains the rollback target until this release is deployed and accepted live.

## Previous production LKG

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

Previous release commit message:

`Release production: QA20 release candidate`

This remains the current live-verified last-known-good production application state until the new release completes live acceptance.

Later `[CF-Pages-Skip]` commits may contain unreleased application, content, documentation, or validation-tooling changes. They do not replace the deployed production LKG until the intentional release procedure and live acceptance are complete.

## Current application release candidate

`APPLICATION_RC = 0dc764c19bf828c551852345b958f79ee5e0cae0`

Repository release-state commit immediately before this release trigger:

`8696fba0fedcecdb605392158993e52760004664`

Purpose:

- reframe K-MAMA from the retired children's-world positioning to the active K-MAMA English identity;
- align the K-MAMA page, HOME room copy, primary navigation, and site metadata;
- keep the approved bright-luxury visual system and production runtime architecture unchanged.

Release verification:

- application work was committed with `[CF-Pages-Skip]` before release;
- source-level contract review completed for the changed K-MAMA/HOME/navigation/metadata files;
- new K-MAMA anchors resolve to real page sections;
- K-MAMA YouTube remains an approved external destination;
- GitHub Site CI run `32621996651` completed successfully on 2026-08-23;
- Site CI job `97151391551` completed with conclusion `success`;
- deploy-intent policy, repository security invariants, production dependency audit, Cloudflare Functions typecheck, lint, Next.js build, and static export verification all passed;
- a temporary draft QA PR was used only to expose the existing pull-request CI path, was not merged, and its QA branch was reset to the current main state after verification;
- this release-trigger commit changes only `RELEASE_ACCEPTANCE.md` and intentionally allows the single Cloudflare production deployment;
- after deployment, desktop/intermediate/mobile live acceptance and the required protected-runtime checks must pass before any new `PRODUCTION_LKG` is recorded.

Do not treat repository HEAD or a successful CI run alone as evidence that the new application release is live.

## Previous Cloudflare deployment — passed

Cloudflare Pages reported **Deployed successfully / Deploy successful** for the previous production LKG release commit above.

The deployment was not inferred from GitHub Site CI. It was separately observed through the Cloudflare Pages check for the release SHA.

## Previous live public acceptance — passed

The successful browser-based Live Acceptance Probe for the previous LKG ran from repository validation commit:

`6e8c3f850d80fe207a5120c950c9904d0fdcd4d2`

GitHub Actions run:

`31938302014`

The probe used a real headless Chrome session against `https://emmakwon.pages.dev`.

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

The previous production homepage was rendered and measured at:

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

The video center matched the exact viewport center.

Intermediate Hero video geometry measured:

- left: `32.796875px`
- width: `754.390625px`
- viewport width: `820px`

It was also horizontally centered.

Mobile Hero video geometry measured:

- left: `0px`
- width: `390px`
- height: `465.828125px`
- viewport width: `390px`

The mobile Hero is edge-to-edge and retains the intended `1080 / 1290` source aspect ratio.

### SEO live files

Previous production HTTP 200 confirmed for:

- `/robots.txt`
- `/sitemap.xml`

`robots.txt` disallows `/admin`, and the sitemap contains the required public room routes.

## Cloudflare Access boundary — previously verified live

Unauthenticated production requests were redirected by Cloudflare Access before reaching the protected Admin/API surface:

- `/admin` → HTTP 302
- `/admin/` → HTTP 302
- `/api/admin` → HTTP 302
- `/api/admin/diagnostics` → HTTP 302

The redirect target was the configured Cloudflare Access login domain.

## Authenticated runtime acceptance — previously passed

An authenticated operator session completed the final checks for the previous production LKG.

### Diagnostics

`/api/admin/diagnostics` returned:

- `ok: true`
- D1 check: `status: "ok"`
- authenticated GitHub read check: `status: "ok"`

This confirmed the production D1 binding and the GitHub Contents read path were healthy behind Cloudflare Access.

### Studio Admin

The authenticated Studio Admin loaded successfully and displayed the current D1-backed post inventory, including drafts and the five published Studio Notes.

A published post was opened and a harmless **Save Changes** operation was exercised without changing content, publishing, or deleting. The UI returned from `Saving…` to the normal `Save Changes` state with no error notice.

## Current promotion rule

The new K-MAMA English release must not replace the production LKG until all required acceptance layers pass:

1. GitHub release verification green. `PASSED`
2. Intentional one-build production release. `TRIGGERED BY THIS COMMIT`
3. Cloudflare Pages deploy success. `PENDING VERIFICATION`
4. Desktop live acceptance. `PENDING`
5. Intermediate/tablet live acceptance. `PENDING`
6. Mobile live acceptance. `PENDING`
7. Public route / SEO live checks. `PENDING`
8. Cloudflare Access boundary verified live. `PENDING RECHECK`
9. Authenticated D1 diagnostics passed. `PENDING RECHECK`
10. Authenticated GitHub read diagnostics passed. `PENDING RECHECK`
11. Studio Admin post inventory loaded. `PENDING RECHECK`
12. Harmless authenticated Admin save passed. `PENDING RECHECK`

Until those steps pass:

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

## Historical pre-release recovery baseline

The final pre-release rendered/runtime/recovery/change-control baseline remains available as:

`cccad3549f4a3fcb7f46a6893617be091353c630`

It remains a useful historical QA 20 baseline. Application rollback rules are in `RELEASE_ROLLBACK.md`; Studio editorial-data recovery rules are in `STUDIO_DATA_RECOVERY.md`.

## Acceptance coverage already automated

Release verification covers repository secret/configuration/backup invariants, production dependency advisories at High/Critical severity, Cloudflare Pages Functions TypeScript compilation, lint, Next.js production build/static export, required routes/files, internal links and anchors, asset paths, canonical/Open Graph/Twitter metadata, robots/sitemap, public Studio publishing invariants, admin noindex, approved external destinations, safe Studio external-media rendering, and public accessibility invariants including H1/main/lang/image alt/button names/new-window link safety.

QA 17 locks runtime resilience: optimistic version guards, D1 zero-row-write detection, no-change save preservation, idempotent GitHub public-content writes, bounded requests, no-store Admin API responses, and separate Cloudflare Functions typechecking.

QA 18 adds incident observability: request IDs, stable Admin API error codes, safe structured logs, diagnostic references, and the protected read-only `/api/admin/diagnostics` probe.

QA 19 separates public-content recovery from private-editorial recovery. Public Git JSON is not a substitute for a full D1 backup when drafts or unpublished edits matter.

QA 20 places the site under change control. `CHANGE_CONTROL.md` defines the release classifications and `[CF-Pages-Skip]` remains the primary control for iterative work.

## Runtime assumptions and boundaries

- The Admin is intentionally single-creator.
- Same-tab mutations are serialized by the UI and stale multi-tab edits are rejected by `updatedAt` version checks.
- There is no global distributed Publish/Delete lock across separate tabs. Do not expand this Admin to multiple simultaneous editors without first designing and deploying an explicit D1 lock/lease migration.
- Repeating a publish/delete that already matches public GitHub state must remain a no-op so it does not create a needless GitHub commit or Cloudflare build.
- A browser timeout is an uncertain outcome, not proof that the server did nothing. Refresh Admin state before retrying a timed-out mutation.
- Diagnostic logs must never include post bodies, request bodies, tokens, authorization headers, passphrases, D1 row dumps, or environment-variable values.
- `/api/admin/diagnostics` is read-only and incident-driven. It must remain protected by Cloudflare Access and must not become an automatic polling loop.
- `studio-posts.json` and an on-demand published seed are not substitutes for a full D1 backup when private drafts/unpublished edits matter.

## Security state

Previously verified live:

- Cloudflare Access protects the required Admin/API paths.
- D1 production binding is healthy behind authenticated Access.
- authenticated GitHub Contents read is healthy.
- authenticated Studio Admin loading and save path are healthy.

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

The site remains change-controlled, not in open-ended rebuild mode.

For any new change:

1. classify it using `CHANGE_CONTROL.md`;
2. use `[CF-Pages-Skip]` for iterative work;
3. run the QA required for that class;
4. create another non-skip release only when a real production application change is intentionally ready.

Never force-push `main` as a rollback method. Production application recovery must preserve history through a new verified rollback commit, following `RELEASE_ROLLBACK.md`. Studio data recovery is a separate decision path and must follow `STUDIO_DATA_RECOVERY.md`.