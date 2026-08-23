# Emma Kwon Website — Release Acceptance

Status: `RELEASED`

Release phase: `PUBLIC LIVE ACCEPTED — AUTHENTICATED SMOKE PENDING`

This file is the current release-state source of truth. Historical acceptance detail remains preserved in Git history.

## Formal production LKG

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

This remains the formal rollback target until the current public release completes the authenticated Admin/runtime smoke checks or the promotion rule is explicitly revised under change control.

## Current K-MAMA English application lineage

Original K-MAMA English application RC:

`0dc764c19bf828c551852345b958f79ee5e0cae0`

Repository release-state commit before the first K-MAMA release:

`8696fba0fedcecdb605392158993e52760004664`

First K-MAMA English production release trigger:

`ef4943233a866095d0f5b1f94101ffb48f7e4c65`

Post-release visual glyph correction application commit:

`94260c6e37b9bbc47dd5eb5695653ee87574146e`

The commit carrying this release document is the intentional production trigger for that one-line glyph correction.

## What the K-MAMA release changed

The released public application:

- reframed K-MAMA from the retired children's-world positioning to K-MAMA English;
- aligned the K-MAMA page, HOME room copy, primary navigation, and metadata;
- retained the approved bright-luxury visual system;
- kept the runtime, Functions, D1, dependencies, and Admin API architecture unchanged.

The K-MAMA page now presents:

- `K-MAMA ENGLISH · LEARNING IN BRISBANE`;
- `I learn it. I get stuck. Then I work out why.`;
- `HOW I LEARN`;
- `START HERE`;
- `REAL LIFE ENGLISH`;
- the first-series focus `I did or I’ve done?`;
- YouTube CTAs to `https://www.youtube.com/@kmama_studio`.

HOME identifies K-MAMA as `ENGLISH LEARNING` with the descriptor `Learning English in Brisbane, one confusing point at a time.`

## Repository release verification — passed

The main K-MAMA release was verified through GitHub Site CI run:

`32621996651`

Job:

`97151391551`

Conclusion:

`success`

Passed checks included:

- deploy-intent policy;
- deployment-intent policy tests;
- dependency installation;
- repository security invariants;
- production dependency audit;
- Cloudflare Functions typecheck;
- lint;
- Next.js production build;
- static export verification.

## Public K-MAMA release-content verification — passed

Live public content was verified through GitHub Site CI run:

`32622166271`

Job:

`97151841816`

Conclusion:

`success`

The live probe confirmed the new K-MAMA English state and confirmed the retired public positioning was absent.

Confirmed present included:

- `K-MAMA ENGLISH`;
- `I learn it. I get stuck. Then I work out why.`;
- `START HERE`;
- `REAL LIFE ENGLISH`;
- HOME category `ENGLISH LEARNING`.

Confirmed absent included:

- `Made for children. Never talked down to.`;
- `STORIES & PLAY`;
- `CHILDREN'S WORLD`.

## Browser-based public live acceptance — passed

The browser-based Live Acceptance Probe was re-run against `https://emmakwon.pages.dev` after the K-MAMA release.

GitHub Actions run:

`31938302014`

Latest accepted job:

`97151949143`

Conclusion:

`success`

Acceptance artifact:

`9488685043`

Public HTTP 200 was confirmed for:

- `/`
- `/sly-fairy/`
- `/emmaestro/`
- `/k-mama/`
- `/books/`
- `/studio/`
- `/studio/notes/`

Each checked public page rendered:

- exactly one H1;
- exactly one main;
- `lang="en"`;
- the expected canonical URL;
- no audited desktop horizontal overflow.

The live K-MAMA page rendered title:

`K-MAMA English — Emma Kwon`

## Responsive HOME acceptance — passed

The live HOME page was measured at:

- desktop `1440 × 1000`;
- intermediate `820 × 1180`;
- mobile `390 × 844`.

All three passed:

- no horizontal overflow;
- one H1;
- visible language globe;
- Hero video present.

Desktop Hero video:

- left `301.390625px`;
- width `837.203125px`;
- height `1000px`.

Intermediate Hero video:

- left `32.796875px`;
- top `140.46875px`;
- width `754.390625px`;
- height `901.0625px`.

Mobile Hero video:

- left `0px`;
- width `390px`;
- height `465.828125px`.

The mobile Hero remains edge-to-edge and retains the intended `1080 / 1290` source aspect ratio.

## K-MAMA full-page visual review — completed

A QA-only draft PR captured full-page live K-MAMA screenshots at desktop, intermediate, and mobile widths.

Visual artifact:

`9488880656`

The review found:

- the page hierarchy is clean and premium;
- section spacing and line length are balanced;
- mobile flow is readable without crowding;
- CTA placement is clear;
- no redesign is warranted.

The review also found one real defect: the literal Hangul word in `Both can become ‘했어요’ in Korean.` rendered as missing-glyph boxes in a browser environment without Korean fonts.

## K-MAMA glyph correction — verified before release

The defect was fixed with the smallest safe content change:

Before:

`Both can become ‘했어요’ in Korean.`

After:

`Both can become the same sentence in Korean.`

Application patch commit:

`94260c6e37b9bbc47dd5eb5695653ee87574146e`

The patch changes only:

`src/content/k-mama.ts`

Diff size:

- 1 line added;
- 1 line removed.

The patch was verified before production through Site CI run:

`32622979878`

Job:

`97153911909`

Conclusion:

`success`

A separate branch-build visual check ran as:

`32622979896`

Job:

`97153911785`

Conclusion:

`success`

Visual artifact:

`9488921889`

That test built the patched branch, rendered K-MAMA at `1440 × 1000`, `820 × 1180`, and `390 × 844`, verified the revised sentence was present, verified the literal Hangul string was absent, checked horizontal overflow, and captured full-page screenshots. Manual visual inspection confirmed the corrected copy reads naturally at desktop and mobile sizes.

## Cloudflare Access boundary — verified live

Unauthenticated production requests remain blocked before the protected Admin/API surface:

- `/admin` → HTTP 302;
- `/admin/` → HTTP 302;
- `/api/admin` → HTTP 302;
- `/api/admin/diagnostics` → HTTP 302.

`robots.txt` and `sitemap.xml` return HTTP 200, and `robots.txt` disallows `/admin`.

## Protected runtime continuity

Comparison from the formal previous `PRODUCTION_LKG` through the K-MAMA public release found no changes to:

- `functions/**`;
- D1 migrations or schema;
- package dependencies;
- Admin API implementation.

The one-line glyph correction also changes none of those areas.

Therefore the protected runtime architecture exercised by the previous authenticated acceptance is structurally unchanged. This is useful continuity evidence, but strict LKG promotion still requires a fresh authenticated smoke or an explicit change-control waiver.

## Previous authenticated runtime acceptance — passed

For the formal LKG, an authenticated operator session previously confirmed:

- `/api/admin/diagnostics` returned `ok: true`;
- D1 check returned `status: "ok"`;
- authenticated GitHub read returned `status: "ok"`;
- Studio Admin loaded the D1-backed post inventory;
- a harmless Save Changes operation completed without error.

These paths have not changed, but they have not been re-run with an authenticated Cloudflare session during the current release sequence.

## Current promotion checklist

1. Repository release verification: `PASSED`
2. Intentional production release: `PASSED`
3. K-MAMA English content verified live: `PASSED`
4. Desktop public acceptance: `PASSED`
5. Intermediate public acceptance: `PASSED`
6. Mobile public acceptance: `PASSED`
7. Public routes and SEO: `PASSED`
8. Cloudflare Access boundary: `PASSED`
9. Full-page K-MAMA visual QA: `PASSED`
10. Glyph correction Site CI: `PASSED`
11. Glyph correction branch visual QA: `PASSED`
12. Authenticated D1 diagnostics recheck: `PENDING`
13. Authenticated GitHub read diagnostics recheck: `PENDING`
14. Studio Admin inventory recheck: `PENDING`
15. Harmless authenticated Admin save recheck: `PENDING`

Until items 12 through 15 are completed or formally waived:

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

## QA audit note

During post-release QA, a temporary root file `README.tmp` was accidentally created on `main` by a connector call and immediately removed in the next `[CF-Pages-Skip]` cleanup commit. Comparison across the two commits showed zero net file differences from the pre-incident tree. No application, content, runtime, or release-document state was changed by that incident. History was preserved rather than force-pushed.

## Rollback and recovery

Historical pre-release recovery baseline:

`cccad3549f4a3fcb7f46a6893617be091353c630`

Application rollback rules live in `RELEASE_ROLLBACK.md`.

Studio editorial-data recovery rules live in `STUDIO_DATA_RECOVERY.md`.

Never force-push `main` as a rollback method.

## Security constraints

- `GITHUB_TOKEN` remains a Cloudflare Pages Secret and fine-grained token limited to `k-mama/emmakwon` with Contents read/write only.
- `NEXT_PUBLIC_ADMIN_PASSPHRASE` is only a client-visible UX deterrent and is not the security boundary.
- Production D1 binding/configuration remains in Cloudflare, not in committed local configuration.
- Real D1 exports remain private and must never be committed.
- `/api/admin/diagnostics` remains read-only, incident-driven, and protected by Cloudflare Access.

## Visual production lock targets

Preserve:

- the approved bright-luxury creative-house direction;
- centered desktop Hero;
- edge-to-edge uncropped mobile Hero;
- visible language globe;
- soft squircle media;
- restrained ambient halo, glass highlight, and depth shadow;
- album covers as a single rounded object;
- BORN RARE 3D book mockup outside the global glow/radius treatment;
- no retired Emma portrait intro.

## Post-release discipline

The site is change-controlled, not in open-ended redesign mode.

For any future change:

1. classify it using `CHANGE_CONTROL.md`;
2. use `[CF-Pages-Skip]` for iterative work;
3. run the QA required for the change class;
4. create a non-skip production release only when a real production change is intentionally ready.
