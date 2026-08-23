# Emma Kwon Website — Release Acceptance

Status: `RELEASED`

Release phase: `PUBLIC LIVE ACCEPTED — AUTHENTICATED SMOKE PENDING`

The K-MAMA English alignment was intentionally released on 2026-08-23 after the repository release gate passed. The new public application content is now verified live. The previous live-verified production LKG remains the formal rollback target until the authenticated Admin/runtime smoke checks are re-run or explicitly waived by a future change-control decision.

## Previous production LKG

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

Previous release commit message:

`Release production: QA20 release candidate`

This remains the formal last-known-good production application state for rollback purposes until the new release completes every LKG promotion requirement.

Later `[CF-Pages-Skip]` commits may contain unreleased application, content, documentation, or validation-tooling changes. They do not replace the production LKG until the intentional release procedure and required acceptance are complete.

## Current released application

`APPLICATION_RC = 0dc764c19bf828c551852345b958f79ee5e0cae0`

Repository release-state commit immediately before the release trigger:

`8696fba0fedcecdb605392158993e52760004664`

Production release trigger:

`ef4943233a866095d0f5b1f94101ffb48f7e4c65`

Release commit message:

`Release production: K-MAMA English alignment`

Purpose:

- reframe K-MAMA from the retired children's-world positioning to the active K-MAMA English identity;
- align the K-MAMA page, HOME room copy, primary navigation, and site metadata;
- keep the approved bright-luxury visual system and production runtime architecture unchanged.

## Repository release verification — passed

GitHub Site CI run `32621996651` completed successfully on 2026-08-23.

Site CI job `97151391551` completed with conclusion `success`.

Passed steps:

- deploy-intent policy;
- deployment-intent policy tests;
- dependency installation;
- repository security invariants;
- production dependency audit;
- Cloudflare Functions typecheck;
- lint;
- Next.js production build;
- static export verification.

A temporary draft QA PR was used only to expose the existing pull-request CI path. It was not merged, and its branch was reset after verification.

## Live K-MAMA release-content verification — passed

A temporary QA-only pull request added a live HTTP content probe to the existing Site CI without changing `main`.

GitHub Site CI run:

`32622166271`

Job:

`97151841816`

The live probe confirmed the deployed public site contains the new K-MAMA English state, including:

- `K-MAMA ENGLISH`;
- `I learn it. I get stuck. Then I work out why.`;
- `START HERE`;
- `REAL LIFE ENGLISH`;
- `/archive/emma/studio-candid.jpg`;
- HOME category `ENGLISH LEARNING`;
- HOME descriptor `Learning English in Brisbane, one confusing point at a time.`

It also confirmed the retired public positioning is absent from the live HTML, including:

- `Made for children. Never talked down to.`;
- `STORIES & PLAY`;
- `CHILDREN'S WORLD`;
- `luxury-fashion-cover-en.png` on the K-MAMA page.

The temporary QA pull request was closed without merge, and its branch was reset to the production release commit afterward.

## Browser-based live public acceptance — passed

The existing browser-based Live Acceptance Probe was re-run after the K-MAMA release against `https://emmakwon.pages.dev`.

GitHub Actions run:

`31938302014`

Latest re-run job:

`97151949143`

Result:

`success`

Acceptance artifact:

`9488685043`

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

The live K-MAMA page specifically rendered:

- title: `K-MAMA English — Emma Kwon`;
- HTTP 200;
- one H1;
- one main;
- `lang="en"`;
- canonical `https://emmakwon.pages.dev/k-mama/`;
- `scrollWidth = 1440` at a `1440` pixel viewport.

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

Desktop Hero video geometry:

- left: `301.390625px`
- width: `837.203125px`
- height: `1000px`
- viewport width: `1440px`

The video center matched the exact viewport center.

Intermediate Hero video geometry:

- left: `32.796875px`
- top: `140.46875px`
- width: `754.390625px`
- height: `901.0625px`
- viewport width: `820px`

It was horizontally centered.

Mobile Hero video geometry:

- left: `0px`
- width: `390px`
- height: `465.828125px`
- viewport width: `390px`

The mobile Hero remains edge-to-edge and retains the intended `1080 / 1290` source aspect ratio.

### SEO live files

Production HTTP 200 confirmed for:

- `/robots.txt`
- `/sitemap.xml`

`robots.txt` disallows `/admin`, and the sitemap contains the required public room routes.

## Cloudflare Access boundary — reverified live

Unauthenticated production requests were redirected by Cloudflare Access before reaching the protected Admin/API surface:

- `/admin` → HTTP 302
- `/admin/` → HTTP 302
- `/api/admin` → HTTP 302
- `/api/admin/diagnostics` → HTTP 302

The redirects still point to the configured Cloudflare Access login domain.

## Runtime-change comparison

A repository comparison from the previous `PRODUCTION_LKG` to the pre-release state found public application, Studio presentation, validation, and documentation changes, but no changes under:

- `functions/**`;
- D1 migrations/schema;
- package dependencies;
- Admin API implementation.

Therefore the protected runtime architecture exercised by the previous authenticated acceptance has not been modified by this release. This continuity is useful evidence, but it does not by itself satisfy the repository's strict formal rule requiring authenticated runtime/Admin smoke checks before recording a new `PRODUCTION_LKG`.

## Previous authenticated runtime acceptance — passed

For the previous LKG, an authenticated operator session confirmed:

### Diagnostics

`/api/admin/diagnostics` returned:

- `ok: true`
- D1 check: `status: "ok"`
- authenticated GitHub read check: `status: "ok"`

### Studio Admin

The authenticated Studio Admin loaded the D1-backed post inventory and completed a harmless **Save Changes** operation with no error.

These runtime paths are unchanged by the K-MAMA release, but the authenticated checks have not been re-run in the current release session because no authenticated Cloudflare/Admin session is available through the connected tooling.

## Current promotion rule

The K-MAMA English release acceptance state is now:

1. GitHub release verification green. `PASSED`
2. Intentional one-build production release. `PASSED`
3. New K-MAMA application content verified live. `PASSED`
4. Desktop live acceptance. `PASSED`
5. Intermediate/tablet live acceptance. `PASSED`
6. Mobile live acceptance. `PASSED`
7. Public route / SEO live checks. `PASSED`
8. Cloudflare Access boundary verified live. `PASSED`
9. Authenticated D1 diagnostics recheck. `PENDING`
10. Authenticated GitHub read diagnostics recheck. `PENDING`
11. Studio Admin post inventory recheck. `PENDING`
12. Harmless authenticated Admin save recheck. `PENDING`

Until items 9 through 12 are completed or the formal promotion rule is intentionally revised:

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

## Historical pre-release recovery baseline

The final pre-release rendered/runtime/recovery/change-control baseline remains available as:

`cccad3549f4a3fcb7f46a6893617be091353c630`

Application rollback rules are in `RELEASE_ROLLBACK.md`; Studio editorial-data recovery rules are in `STUDIO_DATA_RECOVERY.md`.

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

Verified live after the K-MAMA release:

- public routes remain healthy;
- Cloudflare Access still protects the required Admin/API paths;
- K-MAMA English content is deployed;
- HOME responsive geometry remains locked.

Previously authenticated and structurally unchanged:

- D1 production binding;
- authenticated GitHub Contents read;
- authenticated Studio Admin loading and save path.

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