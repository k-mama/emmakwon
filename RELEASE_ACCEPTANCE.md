# Emma Kwon Website — Release Acceptance

Status: `PRODUCTION_LKG — LOCKED`

Production release triggered, deployed, publicly accepted, and authenticated-runtime accepted on 2026-08-16.

## Production LKG

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

Release commit message:

`Release production: QA20 release candidate`

This is the current live-verified last-known-good production application state.

Later `[CF-Pages-Skip]` commits are repository-only documentation / validation-tooling changes and did not replace the deployed production application.

## Cloudflare deployment — passed

Cloudflare Pages reported **Deployed successfully / Deploy successful** for the exact production release commit above.

The deployment was not inferred from GitHub Site CI. It was separately observed through the Cloudflare Pages check for the release SHA.

## Live public acceptance — passed

The successful browser-based Live Acceptance Probe ran from repository validation commit:

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

Production HTTP 200 confirmed for:

- `/robots.txt`
- `/sitemap.xml`

`robots.txt` disallows `/admin`, and the sitemap contains the required public room routes.

## Cloudflare Access boundary — verified live

Unauthenticated production requests were redirected by Cloudflare Access before reaching the protected Admin/API surface:

- `/admin` → HTTP 302
- `/admin/` → HTTP 302
- `/api/admin` → HTTP 302
- `/api/admin/diagnostics` → HTTP 302

The redirect target was the configured Cloudflare Access login domain.

## Authenticated runtime acceptance — passed

An authenticated operator session completed the final checks after the public live acceptance.

### Diagnostics

`/api/admin/diagnostics` returned:

- `ok: true`
- D1 check: `status: "ok"`
- authenticated GitHub read check: `status: "ok"`

This confirms the production D1 binding and the GitHub Contents read path are healthy behind Cloudflare Access.

### Studio Admin

The authenticated Studio Admin loaded successfully and displayed the current D1-backed post inventory, including drafts and the five published Studio Notes.

A published post was opened and a harmless **Save Changes** operation was exercised without changing content, publishing, or deleting. The UI returned from `Saving…` to the normal `Save Changes` state with no error notice.

This completes the authenticated Admin smoke test required for production promotion.

## Production lock decision

The release has now satisfied all required acceptance layers:

1. GitHub release verification green.
2. Intentional one-build production release.
3. Cloudflare Pages deploy success.
4. Desktop live acceptance.
5. Intermediate/tablet live acceptance.
6. Mobile live acceptance.
7. Public route / SEO live checks.
8. Cloudflare Access boundary verified live.
9. Authenticated D1 diagnostics passed.
10. Authenticated GitHub read diagnostics passed.
11. Studio Admin post inventory loaded.
12. Harmless authenticated Admin save passed.

Therefore:

`PRODUCTION_LKG = beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

No new application deployment is required to record this state.

## Historical pre-release recovery baseline

The final pre-release rendered/runtime/recovery/change-control baseline remains available as:

`cccad3549f4a3fcb7f46a6893617be091353c630`

It remains a useful historical QA 20 baseline, but the default production application rollback target is now the live-verified `PRODUCTION_LKG` above.

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

Verified live:

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

The site is now production-locked, not in open-ended rebuild mode.

For any new change:

1. classify it using `CHANGE_CONTROL.md`;
2. use `[CF-Pages-Skip]` for iterative work;
3. run the QA required for that class;
4. create another non-skip release only when a real production application change is intentionally ready.

Never force-push `main` as a rollback method. Production application recovery must preserve history through a new verified rollback commit, following `RELEASE_ROLLBACK.md`. Studio data recovery is a separate decision path and must follow `STUDIO_DATA_RECOVERY.md`.
