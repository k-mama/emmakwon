# Emma Kwon Website — Release Acceptance

Status: `RELEASED`

Release phase: `FULL LIVE ACCEPTED — PRODUCTION LKG PROMOTED — TECHNICAL BUILD LOCKED`

This file is the current release-state source of truth. Older detailed acceptance records remain preserved in Git history.

## Studio Admin email-only authentication release — fully accepted

User-requested production change:

- remove the redundant client-side `NEXT_PUBLIC_ADMIN_PASSPHRASE` prompt;
- keep Cloudflare Access as the sole authentication boundary for `/admin/*` and `/api/admin/*`;
- after successful Cloudflare email verification, open Studio Admin immediately without a second password.

Application candidate:

`b93833840cdcedc9a15779905ad00ec3ca44eb4b`

Production release trigger:

`f4316f0c61dfb6687bb0a05daf0b1237306afbe4`

The application change touches only `src/components/admin/AdminGate.tsx`. It removes the browser-visible passphrase comparison and leaves the existing Admin pages, D1 APIs, GitHub publishing pipeline, and Cloudflare Access boundary unchanged.

A verification-only pull request exercised the full Site CI against the same application state. The PR was not merged.

Verification PR:

`#6`

Site CI run:

`32730038824`

Conclusion:

`success`

Live operator acceptance on 2026-08-25 confirmed that, after Cloudflare email verification, `/admin/` opened Studio Admin directly with no second passphrase prompt. The same authenticated live screen loaded the D1-backed Admin inventory, including the existing draft and published Studio posts.

The protected diagnostics endpoint was then opened in the same authenticated browser session and returned:

- top-level `ok: true`;
- D1 check `status: "ok"`;
- GitHub read check `status: "ok"`.

Finally, the published Studio post `Rebuilding EmmaKwon.com with AI` was opened without modifying any field and `Save Changes` was pressed once. The UI entered `Saving…` and returned to `Save Changes` with no error, completing the harmless authenticated Admin save smoke test.

All release acceptance requirements for this change are now satisfied.

## Formal production LKG

`PRODUCTION_LKG = f4316f0c61dfb6687bb0a05daf0b1237306afbe4`

Promoted: `2026-08-25`

This is the live-verified production deployment commit and the default application rollback target. Later `[CF-Pages-Skip]` documentation commits record acceptance state only and do not replace the deployed production snapshot.

## Current live K-MAMA English release lineage

Original K-MAMA English application RC:

`0dc764c19bf828c551852345b958f79ee5e0cae0`

First K-MAMA English production release trigger:

`ef4943233a866095d0f5b1f94101ffb48f7e4c65`

Post-release glyph correction application patch:

`94260c6e37b9bbc47dd5eb5695653ee87574146e`

Glyph correction production release trigger:

`c1fc5db926e88b234e21175958bf89a600728dba`

The live public site now includes both the K-MAMA English identity alignment and the verified glyph correction.

## Released public identity

K-MAMA is now positioned as English learning in Brisbane, not as the retired children's-world concept.

The live page presents:

- `K-MAMA ENGLISH · LEARNING IN BRISBANE`;
- `I learn it. I get stuck. Then I work out why.`;
- `HOW I LEARN`;
- `START HERE`;
- `REAL LIFE ENGLISH`;
- the first-series focus `I did or I’ve done?`;
- YouTube CTAs to `https://www.youtube.com/@kmama_studio`.

HOME identifies K-MAMA as `ENGLISH LEARNING` with the descriptor `Learning English in Brisbane, one confusing point at a time.`

The retired public positioning is absent, including `CHILDREN'S WORLD`, `STORIES & PLAY`, and `Made for children. Never talked down to.`

## Main K-MAMA repository verification — passed

GitHub Site CI run:

`32621996651`

Job:

`97151391551`

Conclusion:

`success`

Passed checks included deploy-intent policy, deployment-intent policy tests, dependency installation, repository security invariants, production dependency audit, Cloudflare Functions typecheck, lint, Next.js production build, and static export verification.

## Main K-MAMA live-content verification — passed

GitHub Site CI run:

`32622166271`

Job:

`97151841816`

Conclusion:

`success`

The live probe confirmed the new K-MAMA English state and confirmed the retired public positioning was absent.

## K-MAMA full-page visual review — passed

A QA-only visual review captured the actual live K-MAMA page at desktop, intermediate, and mobile widths.

Artifact:

`9488880656`

The page hierarchy, spacing, line length, CTA placement, and mobile flow were judged clean and premium. No redesign was warranted.

That review found one real defect: the literal Hangul word in `Both can become ‘했어요’ in Korean.` rendered as missing-glyph boxes in a browser environment without Korean fonts.

## Glyph correction — passed before release

The smallest safe fix was applied:

Before:

`Both can become ‘했어요’ in Korean.`

After:

`Both can become the same sentence in Korean.`

Application patch:

`94260c6e37b9bbc47dd5eb5695653ee87574146e`

Only `src/content/k-mama.ts` changed, with one line added and one line removed.

Pre-release Site CI:

- run `32622979878`;
- job `97153911909`;
- conclusion `success`.

Pre-release branch visual QA:

- run `32622979896`;
- job `97153911785`;
- conclusion `success`;
- artifact `9488921889`.

The branch was built and rendered at `1440 × 1000`, `820 × 1180`, and `390 × 844`. The revised sentence was present, the literal Hangul string was absent, no audited horizontal overflow was found, and manual screenshot review confirmed natural line wrapping.

## Glyph correction live verification — passed

The production release trigger was:

`c1fc5db926e88b234e21175958bf89a600728dba`

A QA-only browser probe then verified the actual live `/k-mama/` page.

Live verification run:

`32623144169`

Job:

`97154322813`

Conclusion:

`success`

Artifact:

`9488959614`

The live probe confirmed:

- HTTP 200;
- title `K-MAMA English — Emma Kwon`;
- revised sentence `Both can become the same sentence in Korean.` is live;
- old literal `했어요` string is absent;
- mobile horizontal overflow is absent;
- both K-MAMA YouTube CTAs remain present.

## Latest browser-based whole-site live acceptance — passed

The established Live Acceptance Probe was re-run after the glyph correction release.

GitHub Actions run:

`31938302014`

Latest job:

`97154420576`

Conclusion:

`success`

Latest acceptance artifact:

`9488972604`

Public HTTP 200 remains confirmed for:

- `/`
- `/sly-fairy/`
- `/emmaestro/`
- `/k-mama/`
- `/books/`
- `/studio/`
- `/studio/notes/`

The probe also rechecked:

- one H1 and one main on audited public pages;
- `lang="en"`;
- expected canonical URLs;
- no audited desktop horizontal overflow;
- HOME at `1440 × 1000`, `820 × 1180`, and `390 × 844`;
- visible language globe;
- Hero video geometry;
- `robots.txt` and `sitemap.xml` HTTP 200;
- Cloudflare Access boundary on `/admin`, `/admin/`, `/api/admin`, and `/api/admin/diagnostics`.

All public/live checks passed.

## Protected runtime continuity

From the previous production LKG through the K-MAMA releases and the email-only Admin release, there have been no changes to:

- `functions/**`;
- D1 migrations or schema;
- package dependencies;
- Admin API implementation.

The current Admin authentication simplification leaves those runtime systems unchanged. It removes only the redundant client-side passphrase UI after Cloudflare Access.

The strict authenticated promotion requirement has now been satisfied by the 2026-08-25 live operator checks.

## Current authenticated runtime acceptance — passed

The current live production release has now confirmed:

- Cloudflare email verification opens Studio Admin directly without a second password;
- `/api/admin/diagnostics` returned `ok: true`;
- D1 check returned `status: "ok"`;
- authenticated GitHub read returned `status: "ok"`;
- Studio Admin loaded the D1-backed draft and published post inventory;
- a harmless no-change `Save Changes` operation completed without error.

No Publish Now or Delete operation was required for release acceptance.

## Current promotion checklist

1. Repository release verification: `PASSED`
2. Intentional K-MAMA production release: `PASSED`
3. K-MAMA English content verified live: `PASSED`
4. Desktop public acceptance: `PASSED`
5. Intermediate public acceptance: `PASSED`
6. Mobile public acceptance: `PASSED`
7. Public routes and SEO: `PASSED`
8. Cloudflare Access boundary: `PASSED`
9. K-MAMA full-page visual QA: `PASSED`
10. Glyph correction Site CI: `PASSED`
11. Glyph correction branch visual QA: `PASSED`
12. Glyph correction live verification: `PASSED`
13. Whole-site live acceptance after glyph release: `PASSED`
14. Admin email-only authentication pre-release Site CI: `PASSED`
15. Email-only Admin behavior verified live: `PASSED`
16. Authenticated D1 diagnostics recheck: `PASSED`
17. Authenticated GitHub read diagnostics recheck: `PASSED`
18. Studio Admin inventory recheck: `PASSED`
19. Harmless authenticated Admin save recheck: `PASSED`

All promotion checks are complete.

`PRODUCTION_LKG = f4316f0c61dfb6687bb0a05daf0b1237306afbe4`

## QA audit note

During post-release QA, a temporary root file `README.tmp` was accidentally created on `main` by a connector call and immediately removed in the next `[CF-Pages-Skip]` cleanup commit. Comparison across those two commits showed zero net file differences from the pre-incident tree. No application, runtime, or release state remained changed by the incident, and history was preserved rather than force-pushed.

## Rollback and recovery

Historical pre-release recovery baseline:

`cccad3549f4a3fcb7f46a6893617be091353c630`

Application rollback rules: `RELEASE_ROLLBACK.md`.

Studio editorial-data recovery rules: `STUDIO_DATA_RECOVERY.md`.

Never force-push `main` as a rollback method.

## Security constraints

- `GITHUB_TOKEN` remains a Cloudflare Pages Secret and a fine-grained token limited to `k-mama/emmakwon` with Contents read/write only.
- The client-side `NEXT_PUBLIC_ADMIN_PASSPHRASE` gate is retired. Cloudflare Access is the sole authentication boundary for `/admin/*` and `/api/admin/*`.
- Production D1 binding/configuration remains in Cloudflare.
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

The site is now technically locked and change-controlled, not in open-ended redesign mode.

For future changes:

1. classify the change using `CHANGE_CONTROL.md`;
2. use `[CF-Pages-Skip]` for iterative work;
3. run the QA required for that class;
4. create a non-skip production release only when a real production change is intentionally ready.

Routine Studio publishing remains Class 0 and should use the protected Admin workflow without reopening whole-site design QA.