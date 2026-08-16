# Emma Kwon Website — Release Snapshot & Rollback

## Current pre-release snapshot

- Snapshot type: `PRE_RELEASE_RC_SNAPSHOT`
- Rendered/runtime/recovery baseline commit: `cccad3549f4a3fcb7f46a6893617be091353c630`
- Prepared: 2026-08-16
- Verification: GitHub Site CI green through QA 20 deploy-intent classification and policy tests, repository security and backup invariants, High/Critical production dependency audit, Cloudflare Functions typecheck, lint, production build, static export integrity, accessibility, Studio publishing invariants, approved external-destination checks, safe Studio external-media handling, QA 17 runtime resilience, QA 18 incident observability, and QA 19 recovery guardrails.

This SHA is the application/runtime recovery reference for the current release candidate. It also includes the QA 19 data-recovery tooling and QA 20 launch-freeze/change-control system, but **a Git rollback is not a D1 data rollback**. Use `STUDIO_DATA_RECOVERY.md` for editorial database incidents.

## Why this is a commit snapshot instead of a snapshot branch

Do not create a branch merely to preserve this snapshot while Cloudflare Pages build capacity is constrained. A Git-integrated Pages project may be configured to build preview branches, so an extra branch is unnecessary risk. A full Git commit SHA is already an immutable reference to the exact repository tree.

## Rollback principles

1. Never force-push `main` to roll back production.
2. Never delete or rewrite Git history as a recovery shortcut.
3. Restore a known-good tree through a new rollback commit so the incident and recovery remain auditable.
4. Run the full release verification before allowing the rollback commit to trigger Cloudflare.
5. During diagnosis and preparation, keep using `[CF-Pages-Skip]`.
6. Only the final, verified rollback trigger should omit `[CF-Pages-Skip]`, and its message must begin `Rollback production to verified snapshot` so QA 20 deployment-intent policy recognizes it as an explicit recovery deployment.
7. Do not call a rollback successful until the live Cloudflare site has been visually checked after deployment.
8. Do not use a code rollback to guess at D1 recovery. If Studio editorial data itself is damaged, follow `STUDIO_DATA_RECOVERY.md` as a separate incident path.

## Standard application rollback procedure

Use this when a later release introduces a code, static-content, or UI regression and this snapshot is the intended recovery target.

```bash
git fetch origin
git switch main
git pull --ff-only

git status --short
# Stop here unless the worktree is clean.

SNAPSHOT=cccad3549f4a3fcb7f46a6893617be091353c630

git revert --no-commit "${SNAPSHOT}..HEAD"

npm ci
npm run verify:release

git status
git diff --cached
```

If verification is green and the staged rollback is exactly what is intended:

```bash
git commit -m "Rollback production to verified snapshot cccad354"
git push origin main
```

The rollback commit intentionally has **no** `[CF-Pages-Skip]` because its purpose is to restore the live Cloudflare site. QA 20 Site CI recognizes that explicit commit prefix as an approved deployment intent. If Cloudflare capacity is unavailable, do not push the final rollback trigger until capacity is available.

### If `git revert` reports conflicts

Do not force through them. Resolve only after comparing the conflicting files with the snapshot SHA, then rerun:

```bash
npm run verify:release
```

If the desired recovery target is uncertain, stop and inspect the affected commits before creating any deployment-triggering commit.

## Studio data recovery is separate

The application rollback above changes Git-managed code and public static content. It does not rewind private D1 rows.

For any incident involving drafts, unpublished edits, accidental D1 mutation/deletion, a database binding, or database restore/import:

1. Read `INCIDENT_DIAGNOSTICS.md` to classify the failure first.
2. Read `STUDIO_DATA_RECOVERY.md` before changing D1.
3. Preserve the current database if it is still readable.
4. Prefer D1 Time Travel for a recent database incident when the correct recovery point is known.
5. Use a verified private SQL export for longer-term/private-draft recovery.
6. Use GitHub public JSON → on-demand generated seed only when published public content is sufficient and private editorial state is intentionally not being recovered.

Do not reintroduce a committed `migrations/0002_seed_published_posts.sql`; it is deliberately generated on demand so it cannot become a stale recovery artifact.

## Runtime/data-specific recovery note

QA 17–20 deliberately add no production D1 schema migration. The current recovery snapshot therefore does not depend on a new database column/table being present. If a future release introduces a D1 operation-lock or schema migration, its database rollback/forward plan and pre-change backup must be documented before that release replaces this snapshot.

During an incident, a `VERSION_CONFLICT`, missing binding, temporary GitHub read failure, or timeout can often be diagnosed without changing production code or D1. Do not roll back or restore merely because an Admin request returned an error code.

## After a successful production release

After the intentional Cloudflare release has completed and desktop / intermediate / mobile visual acceptance plus the read-only `/api/admin/diagnostics` check are complete, this file may be updated in a `[CF-Pages-Skip]` documentation commit to record the newest **live-verified last-known-good** release SHA.

Use two distinct concepts:

- `PRE_RELEASE_RC_SNAPSHOT`: CI-verified candidate, not yet proven live.
- `PRODUCTION_LKG`: deployed and visually/runtime accepted last-known-good production state.

Never promote a SHA to `PRODUCTION_LKG` based only on GitHub CI.

## Emergency decision rule

If the live site is broken but the defect is isolated and safer to patch than to roll back, make the smallest possible fix with `[CF-Pages-Skip]`, verify it, then make one intentional non-skip `Release production:` commit following `CHANGE_CONTROL.md`. If the defect is broad, uncertain, or affects navigation/content integrity, prefer application rollback to the last live-verified `PRODUCTION_LKG`.

If the incident is primarily D1/editorial-data corruption, do **not** default to an application rollback. Use the dedicated data-recovery decision tree in `STUDIO_DATA_RECOVERY.md`.
