# Emma Kwon Website — Launch Freeze & Change Control

Status: `PRE_RELEASE_FREEZE`

This document controls changes after QA 20. The site is no longer in open-ended rebuild mode. The default is to preserve the release candidate and make only deliberate, scoped changes.

## 1. Freeze rule

Until the current release candidate is intentionally deployed and accepted live:

- Do not make speculative design refinements.
- Do not change approved Hero geometry, mobile composition, navigation, media glow/radius behavior, or brand-room architecture unless the user explicitly requests that change or a concrete defect is observed.
- Do not revive retired placeholders, empty archives, fake commerce links, unused portrait/introduction panels, or decorative filler.
- Every iterative commit to `main` must use `[CF-Pages-Skip]`.
- Batch related work into one milestone. Do not use a Cloudflare build merely as a preview mechanism.

The approved release candidate should move forward only because of a real content need, a verified defect, a security/platform requirement, or an explicitly requested feature.

## 2. Change classes

### Class 0 — Studio editorial publishing

Examples:
- publish/update/remove a Studio Note through the protected Admin;
- no application code, layout, routing, configuration, or dependency change.

Procedure:
- Use the existing Admin `Publish Now` / Delete flow.
- The GitHub commit must change only `src/content/studio-posts.json`.
- Commit messages are generated as `Publish Studio note: ...` or `Remove Studio note: ...`.
- This is an intentional content deployment and does not require reopening the full design QA cycle.
- If a mutation times out or returns an uncertain result, refresh and use diagnostics before retrying.

### Class 1 — Low-risk public content/media maintenance

Examples:
- correct a typo in existing public copy;
- replace an image with the same role/aspect behavior;
- update an approved external destination;
- metadata copy correction that does not change routing or rendering architecture.

Procedure:
- Work with `[CF-Pages-Skip]`.
- Run `npm run verify:release` before release.
- Recheck only the affected page plus its mobile presentation and links.
- Batch multiple small corrections into one intentional release.

### Class 2 — UI, layout, responsive, navigation, SEO, or route change

Examples:
- CSS/layout changes;
- Header or mobile-nav changes;
- Hero behavior;
- adding/removing routes or anchors;
- metadata architecture, sitemap, robots, canonical behavior;
- global media surface/glow/radius rules.

Procedure:
- Reopen the relevant visual/accessibility/responsive QA.
- Use `[CF-Pages-Skip]` while iterating.
- Run the full `npm run verify:release` gate.
- After the one intentional release, visually check desktop, intermediate/tablet, and phone widths before production lock.

### Class 3 — Runtime, security, dependency, Functions, D1, or deployment architecture

Examples:
- `functions/**` changes;
- D1 schema/query changes;
- GitHub publishing code;
- Cloudflare bindings/Access/deployment behavior;
- package/dependency upgrades;
- secret/config handling;
- backup/recovery or observability changes.

Procedure:
- Treat as high risk even when the code diff is small.
- Require repository security, dependency audit, Functions typecheck, lint, build, and static export checks.
- Use `/api/admin/diagnostics` after the real deployment.
- If a D1 migration, destructive maintenance query, binding switch, or data-risk operation is involved, create and verify a private D1 export first according to `STUDIO_DATA_RECOVERY.md`.
- Do not combine a Class 3 change with unrelated design work.

### Class 4 — Emergency recovery

Examples:
- broken production release;
- damaged D1 state;
- lost/missing public Studio content;
- publishing pipeline incident.

Procedure:
- Diagnose first with `INCIDENT_DIAGNOSTICS.md`.
- Application rollback follows `RELEASE_ROLLBACK.md`.
- Studio editorial-data recovery follows `STUDIO_DATA_RECOVERY.md`.
- Never force-push `main` or improvise a destructive production import.

## 3. Approved non-skip main commits

A push to `main` without `[CF-Pages-Skip]` is a deployment-intent event. Only these forms are approved:

1. `Publish Studio note: ...` or `Remove Studio note: ...`
   - exactly one changed file: `src/content/studio-posts.json`.
2. `Release production: ...`
   - exactly one changed file: `RELEASE_ACCEPTANCE.md`;
   - release status must be `RELEASED`.
3. `Rollback production to verified snapshot ...`
   - explicit emergency application rollback following `RELEASE_ROLLBACK.md`.

`scripts/check-deploy-intent.mjs` enforces this classification in GitHub Site CI.

Important limitation: this CI gate detects a mistaken non-skip push after GitHub receives it. Cloudflare Git integration may already have observed the push. The primary quota-protection control therefore remains the commit prefix `[CF-Pages-Skip]`; the CI gate is a second line of defense, not a replacement for the prefix.

## 4. Intentional release procedure

For an ordinary application release:

1. Finish all iterative work using `[CF-Pages-Skip]`.
2. Confirm the latest release-candidate HEAD is green in Site CI or run `npm run verify:release`.
3. Confirm Cloudflare Pages build capacity is available.
4. Confirm `RELEASE_ROLLBACK.md` and, when relevant, `STUDIO_DATA_RECOVERY.md` are current.
5. Change only `RELEASE_ACCEPTANCE.md` status to `RELEASED`.
6. Commit with a message beginning `Release production:` and **without** `[CF-Pages-Skip]`.
7. Let that one commit be the intentional Cloudflare deployment trigger.
8. Perform live visual/runtime/diagnostic acceptance before promoting the release to `PRODUCTION_LKG`.

If any unrelated file needs to change, stop. Return to `[CF-Pages-Skip]`, make the change, reverify, and prepare a new release trigger.

## 5. Post-release maintenance rhythm

Do not create maintenance churn merely because time has passed. Maintenance is condition-driven.

Use a maintenance pass when one of these occurs:

- a High/Critical production dependency advisory appears;
- Next.js/React/Cloudflare introduces a relevant breaking/security requirement;
- a real browser/device regression is reported;
- a public link or external destination changes;
- Studio Admin diagnostics expose a persistent runtime problem;
- a new feature/content project requires structural work;
- the user explicitly asks for a redesign/change.

For routine Studio Notes, use Class 0. Do not reopen the whole website QA for normal publishing.

## 6. Production acceptance and last-known-good

`PRE_RELEASE_RC_SNAPSHOT` means CI-verified only.

`PRODUCTION_LKG` may be recorded only after:

- the intended Cloudflare deployment completed;
- desktop/intermediate/phone visual acceptance passed;
- public navigation/content passed;
- Cloudflare Access-protected `/api/admin/diagnostics` passed D1 and GitHub read checks;
- Admin read/save smoke test passed.

Do not call a GitHub SHA production-safe merely because CI is green.
