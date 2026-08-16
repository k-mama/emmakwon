# Emma Kwon Website — Release Snapshot & Rollback

## Current production last-known-good

- Snapshot type: `PRODUCTION_LKG`
- Live-verified production commit: `beac618e8b7ff5d4a58f0ff567defa14b4d01dee`
- Promoted: 2026-08-16
- Verification: GitHub release checks green; Cloudflare Pages deployment successful; public browser probe green at desktop/intermediate/mobile; public routes/SEO live checks green; Cloudflare Access boundary verified; authenticated `/api/admin/diagnostics` returned D1 `ok` and GitHub read `ok`; Studio Admin inventory loaded; harmless authenticated Save Changes completed without error.

This is the default application rollback target for future production regressions.

The historical QA 20 pre-release baseline remains available as:

`cccad3549f4a3fcb7f46a6893617be091353c630`

Use the live-verified `PRODUCTION_LKG` by default unless an incident investigation proves an older historical baseline is intentionally required.

A Git rollback is **not** a D1 data rollback. Use `STUDIO_DATA_RECOVERY.md` for editorial database incidents.

## Why this is a commit snapshot instead of a snapshot branch

Do not create a branch merely to preserve a rollback point. A full Git commit SHA is already an immutable reference to the exact repository tree, and extra branches can create unnecessary Cloudflare preview-build risk depending on Pages branch controls.

## Rollback principles

1. Never force-push `main` to roll back production.
2. Never delete or rewrite Git history as a recovery shortcut.
3. Restore a known-good tree through a new rollback commit so the incident and recovery remain auditable.
4. Run the full release verification before allowing the rollback commit to trigger Cloudflare.
5. During diagnosis and preparation, keep using `[CF-Pages-Skip]`.
6. Only the final, verified rollback trigger should omit `[CF-Pages-Skip]`, and its message must begin `Rollback production to verified snapshot` so deployment-intent policy recognizes it as an explicit recovery deployment.
7. Do not call a rollback successful until the live Cloudflare site has been visually checked after deployment.
8. Do not use a code rollback to guess at D1 recovery. If Studio editorial data itself is damaged, follow `STUDIO_DATA_RECOVERY.md` as a separate incident path.

## Standard application rollback procedure

Use this when a later release introduces a code, static-content, or UI regression and the current production LKG is the intended recovery target.

```bash
git fetch origin
git switch main
git pull --ff-only

git status --short
# Stop here unless the worktree is clean.

SNAPSHOT=beac618e8b7ff5d4a58f0ff567defa14b4d01dee

git revert --no-commit "${SNAPSHOT}..HEAD"

npm ci
npm run verify:release

git status
git diff --cached
```

If verification is green and the staged rollback is exactly what is intended:

```bash
git commit -m "Rollback production to verified snapshot beac618e"
git push origin main
```

The rollback commit intentionally has **no** `[CF-Pages-Skip]` because its purpose is to restore the live Cloudflare site. If Cloudflare capacity is unavailable, do not push the final rollback trigger until capacity is available.

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

The current production LKG does not depend on a new D1 schema migration introduced by QA 17–20. If a future release introduces a D1 operation-lock or schema migration, its database rollback/forward plan and pre-change backup must be documented before that release replaces this LKG.

During an incident, a `VERSION_CONFLICT`, missing binding, temporary GitHub read failure, or timeout can often be diagnosed without changing production code or D1. Do not roll back or restore merely because an Admin request returned an error code.

## Promotion rules for future releases

Use two distinct concepts:

- `PRE_RELEASE_RC_SNAPSHOT`: CI-verified candidate, not yet proven live.
- `PRODUCTION_LKG`: deployed and visually/runtime accepted last-known-good production state.

Never promote a SHA to `PRODUCTION_LKG` based only on GitHub CI.

A future release replaces the current production LKG only after:

1. intentional production deployment;
2. Cloudflare deploy success;
3. live public desktop/intermediate/mobile acceptance;
4. live Access boundary verification when relevant;
5. authenticated diagnostics when Functions/D1/GitHub runtime is affected;
6. harmless Admin smoke when Admin runtime is affected.

Record the new LKG in a later `[CF-Pages-Skip]` documentation commit. Do not create another application deployment merely to record the promotion.

## Emergency decision rule

If the live site is broken but the defect is isolated and safer to patch than to roll back, make the smallest possible fix with `[CF-Pages-Skip]`, verify it, then make one intentional non-skip `Release production:` commit following `CHANGE_CONTROL.md`.

If the defect is broad, uncertain, or affects navigation/content integrity, prefer application rollback to:

`beac618e8b7ff5d4a58f0ff567defa14b4d01dee`

unless a newer live-verified `PRODUCTION_LKG` has since replaced it.

If the incident is primarily D1/editorial-data corruption, do **not** default to an application rollback. Use the dedicated data-recovery decision tree in `STUDIO_DATA_RECOVERY.md`.
