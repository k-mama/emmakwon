# Studio Publishing — Architecture & Setup

## Final architecture

EmmaKwon.com is a **Cloudflare Pages–centered project**. The Studio
publishing pipeline is:

- **Cloudflare Pages** — static site, built from this repo and deployed
  automatically on every push to `main` (unchanged, original deployment
  model).
- **Pages Functions** (`functions/api/admin/**`) — the admin's only
  server-side surface. Reads and writes D1, and is the only thing that
  holds the GitHub token.
- **D1** (`STUDIO_DB`) — private editorial state (drafts, and any
  scheduled-but-unpublished records). The public site never queries it.
- **Cloudflare Access** — protects `/admin`, `/admin/*`, `/api/admin`,
  and `/api/admin/*` (four separate path rules — a wildcard does not
  also protect its own parent path).
- **GitHub publishing** — "Publish Now" commits the updated
  `src/content/studio-posts.json` directly to `main` via the GitHub
  Contents API, which triggers the existing Cloudflare Pages Git
  deployment. This has been verified working in production.

**Publishing is manual through Publish Now.** There is no scheduler, no
Cron Trigger, and no standalone Cloudflare Worker anywhere in this project —
a standalone scheduler Worker was built, deployed, and then deliberately
removed; automatic scheduled publishing is not part of this architecture.
`scheduledAt` and a `"scheduled"` status still exist in the D1 schema and the
`StudioPost` type (removing them would need a schema migration, and nothing
depends on them being gone), but nothing in the admin UI creates new
scheduled posts, and nothing automatically publishes one. A post already in
that state is only resolved manually — open it in the editor and either
**Save Draft** (reverts it) or **Publish Now** (publishes it immediately).

---

## Which Wrangler file is which

- **`wrangler.local.toml`** (repo root) — local development only, for
  running D1 migrations/queries against a local or remote database from
  your machine. Never read by production. It deliberately has no
  `pages_build_output_dir`, the field that makes Wrangler treat a file
  as "this project's real Pages configuration" — so this file can't
  accidentally become that, no matter what triggers a Cloudflare Pages
  build.
- **Production Pages configuration lives in the Cloudflare dashboard**,
  not in a committed file (see step E below). This repo intentionally
  does **not** contain a root `wrangler.toml` with
  `pages_build_output_dir` — if one existed with a placeholder
  `database_id`, Cloudflare Pages could pick it up as real project
  configuration on the next deploy. Dashboard configuration has no such
  risk and requires no repo changes to update.

There is no other Wrangler config in this repo — no standalone Worker.

## Your production hostname

Confirm it in the Cloudflare dashboard → your Pages project → the exact
hostname(s) shown there (the `*.pages.dev` subdomain, and any custom
domain attached) rather than assuming one — you need it correct for the
Access rules in step C.

---

## A. Create the D1 database

```
npx wrangler d1 create emmakwon-studio
```

This prints a `database_id`. Fill it into `wrangler.local.toml` for
your own local use and into the Cloudflare dashboard D1 binding (step
E) — never into a committed file.

## B. Apply the schema and current published Studio content

Apply the schema first:

```
npx wrangler d1 execute STUDIO_DB --remote --config wrangler.local.toml --file=migrations/0001_create_studio_posts.sql
```

The published-content seed is deliberately **not committed** because
`src/content/studio-posts.json` changes whenever Publish Now is used. A
committed seed would inevitably become stale. Generate a fresh seed from the
exact Git revision you intend to use, then apply it:

```
npm run prepare:studio-seed
npx wrangler d1 execute STUDIO_DB --remote --config wrangler.local.toml --file=migrations/0002_seed_published_posts.sql
```

`migrations/0002_seed_published_posts.sql` is gitignored and generated on
demand. It is an idempotent upsert by `id`, but it represents **published
content only**. It is not a backup of drafts or unpublished edits. Do not run
it as a general repair on a live D1 that may contain newer private edits on
already-published rows. For data recovery, read `STUDIO_DATA_RECOVERY.md`.

## C. Configure Cloudflare Access — before any write token exists

Do this **before** step D. Cloudflare dashboard → Zero Trust → Access →
Applications → **Add an application** → Self-hosted. Using the
confirmed hostname from above, create **four** separate path rules:

- `<your-hostname>/admin`
- `<your-hostname>/admin/*`
- `<your-hostname>/api/admin`
- `<your-hostname>/api/admin/*`

Policy: allow only your own email. Single creator — don't build
additional users, roles, or registration.

`NEXT_PUBLIC_ADMIN_PASSPHRASE` (already in the code) is a UX deterrent
only, not real security for a static site — anything shipped to the
browser is readable in the bundle. Access is the actual boundary.

## D. Create a narrowly scoped GitHub token

Only now, with Access already protecting the admin paths. GitHub →
Settings → Developer settings → **Fine-grained personal access tokens**
→ Generate new token.

- **Repository access**: only `k-mama/emmakwon` (not all repos)
- **Permissions**: Repository → **Contents: Read and write**. Nothing
  else. Do **not** grant Workflows permission — post publication only
  ever writes `src/content/studio-posts.json`, never a
  `.github/workflows/*` file.
- Copy the token once — GitHub won't show it again.

## E. Add the D1 binding and GitHub config to the Pages project

Cloudflare dashboard → your Pages project → **Settings → Functions**.
This dashboard configuration is the single source of truth for the
Pages project's bindings and secrets — there is no wrangler.toml also
configuring these, so there's nothing to keep in sync.

1. **D1 database binding**: variable name `STUDIO_DB`, database
   `emmakwon-studio`.
2. **Environment variables**, Production environment:

   | Name | Value | Type |
   |---|---|---|
   | `GITHUB_TOKEN` | *(from step D)* | **Secret** |
   | `GITHUB_OWNER` | `k-mama` | Plaintext |
   | `GITHUB_REPO` | `emmakwon` | Plaintext |
   | `GITHUB_BRANCH` | `main` | Plaintext |
   | `GITHUB_CONTENT_PATH` | `src/content/studio-posts.json` | Plaintext |
   | `NEXT_PUBLIC_ADMIN_PASSPHRASE` | *(your choice)* | Either — it's client-visible regardless |

`GITHUB_TOKEN` **must** be added as a Secret, never plaintext.

---

That's the whole publishing pipeline. Once A–E are done, publishing works
end-to-end: write a post in `/admin`, Preview it, then Publish Now — that
commits to GitHub and Cloudflare Pages deploys it normally.

For backup, Time Travel, SQL export, and disaster-recovery procedures, use
`STUDIO_DATA_RECOVERY.md`. Do not improvise a production D1 restore from the
bootstrap seed.
