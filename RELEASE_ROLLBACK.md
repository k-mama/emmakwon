# Emma Kwon Website — Release Snapshot & Rollback

## Current pre-release snapshot

- Snapshot type: `PRE_RELEASE_RC_SNAPSHOT`
- Rendered/runtime baseline commit: `5f2e6f4c5c36083ac3f0dc9bb3cf2f367f52c3c9`
- Prepared: 2026-08-16
- Verification: GitHub Site CI green through repository security invariants, High/Critical production dependency audit, Cloudflare Functions typecheck, lint, production build, static export integrity, accessibility, Studio publishing invariants, approved external-destination checks, safe Studio external-media handling, QA 17 runtime resilience, and QA 18 incident-observability code paths.

This SHA is the recovery reference for the current release candidate. Later QA 18 documentation commits do not intentionally alter the rendered public website or the Pages Functions runtime behavior.

## Why this is a commit snapshot instead of a snapshot branch

Do not create a branch merely to preserve this snapshot while Cloudflare Pages build capacity is constrained. A Git-integrated Pages project may be configured to build preview branches, so an extra branch is unnecessary risk. A full Git commit SHA is already an immutable reference to the exact repository tree.

## Rollback principles

1. Never force-push `main` to roll back production.
2. Never delete or rewrite Git history as a recovery shortcut.
3. Restore a known-good tree through a new rollback commit so the incident and recovery remain auditable.
4. Run the full release verification before allowing the rollback commit to trigger Cloudflare.
5. During diagnosis and preparation, keep using `[CF-Pages-Skip]`.
6. Only the final, verified rollback commit should omit `[CF-Pages-Skip]` when a Cloudflare deployment is intentionally required.
7. Do not call a rollback successful until the live Cloudflare site has been visually checked after deployment.

## Standard rollback procedure

Use this when a later release introduces a regression and this snapshot is the intended recovery target.

```bash
git fetch origin
git switch main
git pull --ff-only

git status --short
# Stop here unless the worktree is clean.

SNAPSHOT=5f2e6f4c5c36083ac3f0dc9bb3cf2f367f52c3c9

git revert --no-commit "${SNAPSHOT}..HEAD"

npm ci
npm run verify:release

git status
git diff --cached
```

If verification is green and the staged rollback is exactly what is intended:

```bash
git commit -m "Rollback production to verified snapshot 5f2e6f4c"
git push origin main
```

The rollback commit intentionally has **no** `[CF-Pages-Skip]` because its purpose is to restore the live Cloudflare site. If Cloudflare capacity is unavailable, do not push the final rollback trigger until capacity is available.

### If `git revert` reports conflicts

Do not force through them. Resolve only after comparing the conflicting files with the snapshot SHA, then rerun:

```bash
npm run verify:release
```

If the desired recovery target is uncertain, stop and inspect the affected commits before creating any deployment-triggering commit.

## Runtime-specific recovery note

QA 17–18 deliberately added no production D1 schema migration. The recovery snapshot therefore does not depend on a new database column/table being present. If a future release introduces a D1 operation-lock migration, its database rollback/forward plan must be documented separately before that release replaces this snapshot.

During an incident, use `INCIDENT_DIAGNOSTICS.md` before deciding to roll back. A `VERSION_CONFLICT`, missing binding, temporary GitHub read failure, or timeout can often be diagnosed without changing production code. Do not roll back merely because an Admin request returned an error code.

## After a successful production release

After the intentional Cloudflare release has completed and desktop / intermediate / mobile visual acceptance plus the read-only `/api/admin/diagnostics` check are complete, this file may be updated in a `[CF-Pages-Skip]` documentation commit to record the newest **live-verified last-known-good** release SHA.

Use two distinct concepts:

- `PRE_RELEASE_RC_SNAPSHOT`: CI-verified candidate, not yet proven live.
- `PRODUCTION_LKG`: deployed and visually/runtime accepted last-known-good production state.

Never promote a SHA to `PRODUCTION_LKG` based only on GitHub CI.

## Emergency decision rule

If the live site is broken but the defect is isolated and safer to patch than to roll back, make the smallest possible fix with `[CF-Pages-Skip]`, verify it, then make one intentional non-skip release commit. If the defect is broad, uncertain, or affects navigation/content integrity, prefer rollback to the last live-verified `PRODUCTION_LKG`.
