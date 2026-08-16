# Emma Kwon Studio — Data Backup & Recovery

This document covers Studio editorial data only. It does not replace
`RELEASE_ROLLBACK.md`, which covers application-code rollback.

## 1. Know which data lives where

### Private editorial state — Cloudflare D1

`STUDIO_DB.studio_posts` is the operational database for Admin. It can
contain drafts, published rows, private edits that have not yet been
republished, GitHub commit bookkeeping, and the last publish error.

A full D1 backup is therefore **private editorial material**. Never commit a
D1 export to GitHub.

### Public published state — GitHub

`src/content/studio-posts.json` contains published posts only. Git history is
the durable record of every public version that was committed.

This JSON is sufficient to rebuild the public Studio notes, but it is **not**
a backup of private drafts or unpublished edits.

### Generated published-content seed

`migrations/0002_seed_published_posts.sql` is no longer committed. It is a
gitignored generated artifact created from `src/content/studio-posts.json`.
Generate it only when needed:

```bash
npm run prepare:studio-seed
```

Never use an old copy from a previous recovery attempt. Generate it from the
exact Git revision whose public content you intend to restore.

The seed restores published rows only. It does not recreate D1-only drafts.
It can also overwrite unpublished edits that are sitting on an
already-published D1 row, so **do not use the published seed as a general
repair tool on a live database**. Prefer Time Travel or a full D1 export when
private editorial state matters.

---

## 2. Recovery layers

Use the least destructive layer that solves the incident.

### Layer A — Git history for public content

Use this when only a public note or `studio-posts.json` was changed wrongly.
Restore through a normal auditable Git revert/repair commit. Do not touch D1
unless Admin state is also wrong.

### Layer B — D1 Time Travel for recent database incidents

Cloudflare D1 Time Travel is automatic on supported production-storage D1
databases. It supports point-in-time recovery. On the Workers Free plan the
recovery window is currently 7 days; verify current Cloudflare documentation
before an emergency restore because platform limits can change.

Check the database storage version:

```bash
npx wrangler d1 info STUDIO_DB --config wrangler.local.toml
```

A database reporting `version: production` supports Time Travel.

Inspect the current bookmark:

```bash
npx wrangler d1 time-travel info STUDIO_DB --config wrangler.local.toml
```

Inspect the bookmark for a known pre-incident timestamp:

```bash
npx wrangler d1 time-travel info STUDIO_DB \
  --config wrangler.local.toml \
  --timestamp="2026-08-16T07:00:00Z"
```

**Do not restore yet.** First record the current bookmark and, if the DB is
still readable, create a fresh SQL export with `npm run backup:studio`.

Time Travel restore overwrites the database in place and cancels in-flight
queries. It is a destructive incident-recovery action:

```bash
npx wrangler d1 time-travel restore STUDIO_DB \
  --config wrangler.local.toml \
  --bookmark=<CONFIRMED_PRE_INCIDENT_BOOKMARK>
```

After restore, immediately verify Admin reads and run the read-only
`/api/admin/diagnostics` endpoint through Cloudflare Access. Do not Publish or
Delete merely as a smoke test.

### Layer C — long-term SQL export

Use this when the incident is older than the Time Travel window, when you
want an independent archive before risky maintenance, or when preserving
private drafts long-term matters.

Create a private export:

```bash
npm run backup:studio
```

The command runs a remote D1 export and writes three gitignored files under
`.studio-backups/`:

- `studio-d1-<timestamp>.sql` — full D1 SQL export
- matching `.sha256` — integrity checksum
- matching `.json` — small manifest with time, size, and checksum

Copy all three files to private storage outside the repository. A local copy
on the same laptop is not a sufficient long-term backup.

Verify a stored copy before trusting it:

```bash
npm run verify:studio-backup -- .studio-backups/studio-d1-<timestamp>.sql
```

A checksum mismatch means the file must not be used for restore.

---

## 3. Routine backup moments

A manual D1 export is most valuable:

- before a schema migration or one-off maintenance query;
- before any intentionally destructive D1 operation;
- before changing the production D1 binding;
- after a meaningful block of private draft work that you would not want to
  lose outside the Time Travel window;
- before leaving the project untouched for an extended period.

Do not run backup exports on every page view, CI run, or normal Publish Now.
Backups are an operational action, not application traffic.

---

## 4. Validate the current database before recovery

When the DB is still queryable, capture a small state summary before changing
anything:

```bash
npx wrangler d1 execute STUDIO_DB \
  --remote \
  --config wrangler.local.toml \
  --command="SELECT status, COUNT(*) AS count FROM studio_posts GROUP BY status ORDER BY status;"
```

Then inspect recent versions without dumping bodies into logs or chat:

```bash
npx wrangler d1 execute STUDIO_DB \
  --remote \
  --config wrangler.local.toml \
  --command="SELECT id, slug, status, updated_at, published_at FROM studio_posts ORDER BY updated_at DESC;"
```

Record only what is needed for incident comparison. Avoid copying full draft
bodies into tickets, logs, screenshots, or chat unless explicitly required.

---

## 5. Restoring from a SQL export

A SQL import modifies its target database. Do not blindly import a full D1
export over the live production database.

Preferred procedure:

1. Preserve the damaged/current DB first if it is still readable.
2. Verify the backup checksum.
3. Create a temporary recovery D1 database.
4. Point an **uncommitted local Wrangler config** at that temporary database.
5. Import the backup SQL into the temporary database with `wrangler d1 execute
   --remote --file=<backup.sql>`.
6. Run the count/version queries from section 4 against the temporary DB.
7. Confirm critical drafts and published rows in Admin-equivalent queries.
8. Only after verification decide whether production should be restored by
   Time Travel, by a controlled import, or by switching the Pages D1 binding
   to a verified replacement database.
9. Re-run `/api/admin/diagnostics` after the production binding/state is
   finalized.

Do not commit a temporary recovery database ID or recovery Wrangler config.

---

## 6. Rebuilding D1 from GitHub public content only

Use this only when private draft recovery is not required, such as building a
fresh Studio database from the public archive.

First check out the exact Git revision you intend to use. Then:

```bash
npx wrangler d1 execute STUDIO_DB \
  --remote \
  --config wrangler.local.toml \
  --file=migrations/0001_create_studio_posts.sql

npm run prepare:studio-seed

npx wrangler d1 execute STUDIO_DB \
  --remote \
  --config wrangler.local.toml \
  --file=migrations/0002_seed_published_posts.sql
```

Again: this rebuilds **published content only**. Drafts and private
unpublished edits are absent because GitHub never contained them.

Delete the generated seed after use if desired; it is already gitignored.

---

## 7. Incident decision table

| Incident | First choice | Why |
|---|---|---|
| Wrong public Studio commit, D1 is fine | Git revert/repair | Do not touch private DB state |
| Accidental D1 edit/delete within Time Travel window | Time Travel | Preserves private editorial state at that point |
| Need state older than Time Travel window | Verified SQL export | Independent long-term copy |
| Fresh D1 needed and public notes are enough | Git JSON → generated seed | Rebuilds public state without pretending drafts exist |
| Unsure whether Publish completed | Refresh + diagnostics + requestId logs | Do not create duplicate writes while outcome is uncertain |

---

## 8. Non-negotiable safety rules

- Never commit `.studio-backups/`, database IDs, tokens, or recovery config.
- Never describe `studio-posts.json` as a draft backup.
- Never describe a generated published seed as a full D1 backup.
- Never Time Travel restore without first identifying the exact target
  bookmark/timestamp and recording the current state.
- Never import a full SQL backup into production merely to test whether the
  file works.
- Never force-push Git history as a data-recovery shortcut.
- After any real production data recovery, verify Cloudflare Access,
  `/api/admin/diagnostics`, Admin read/save behavior, and the public Studio
  pages before declaring the incident closed.
