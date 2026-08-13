# Studio Publishing — Manual Setup

Phase 3 code is complete and locally verified, but it cannot go live
until you complete the steps below in your own Cloudflare and GitHub
accounts. None of this can be done from the repository alone — these
are real account-level resources, and none of them exist yet.

**Follow the sections in order.** Security (C) is configured before a
working GitHub write token ever touches the admin (D) — an admin with a
real publish token but no Access protection is an open door to your
repository. Do the steps out of order and there's a window where that's
true.

---

## Which Wrangler file is which

- **`wrangler.local.toml`** (repo root) — local development only. Never
  read by production. It deliberately has no `pages_build_output_dir`,
  the field that makes Wrangler treat a file as "this project's real
  Pages configuration" — so this file can't accidentally become that,
  no matter what triggers a Cloudflare Pages build.
- **Production Pages configuration lives in the Cloudflare dashboard**,
  not in a committed file (see step E). This repo intentionally does
  **not** contain a root `wrangler.toml` with `pages_build_output_dir` —
  if one existed with a placeholder `database_id`, Cloudflare Pages
  could pick it up as real project configuration on the next deploy.
  Dashboard configuration has no such risk and requires no repo changes
  to update.
- **`workers/studio-scheduler/wrangler.toml`** — this one's different:
  it's a standalone Worker (not part of the Pages project), and
  Workers have no dashboard-driven alternative — `wrangler deploy`
  always reads this file directly. That's fine, because deploying it is
  an explicit manual command (step F), never triggered by a git push —
  a placeholder `database_id` sitting in it carries no live-site risk
  until you actually run that command.

## Your production hostname isn't confirmed yet

Don't assume `emmakwon2.pages.dev` or any other domain is correct.
Check Cloudflare dashboard → your Pages project → the exact hostname(s)
shown there (the `*.pages.dev` subdomain, and any custom domain you've
attached) before doing step C — you're about to write Access rules
against real URLs.

---

## A. Create the D1 database

```
npx wrangler d1 create emmakwon-studio
```

This prints a `database_id`. You'll need it in three places, filled in
as you reach each step below: `wrangler.local.toml` (for your own local
testing), the Cloudflare dashboard D1 binding (step E), and
`workers/studio-scheduler/wrangler.toml` (step F).

## B. Apply the migrations to the real database

```
npx wrangler d1 execute STUDIO_DB --remote --config wrangler.local.toml --file=migrations/0001_create_studio_posts.sql
npx wrangler d1 execute STUDIO_DB --remote --config wrangler.local.toml --file=migrations/0002_seed_published_posts.sql
```

(Fill in the real `database_id` in `wrangler.local.toml` first — `d1
execute` needs it to know which remote database to talk to, even though
the file is otherwise local-only.) The seed file is idempotent (upserts
by `id`) — safe to re-run any time `src/content/studio-posts.json`
changes (regenerate it first with `node scripts/generate-studio-seed.mjs`).

## C. Configure Cloudflare Access — before any write token exists

Do this **before** step D. Cloudflare dashboard → Zero Trust → Access →
Applications → **Add an application** → Self-hosted. Using the
confirmed hostname from above, create **four** separate path rules (a
wildcard does not also protect its own parent path):

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
  else. Do **not** grant Workflows permission — normal post publication
  only ever writes `src/content/studio-posts.json`, never a
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

## F. Deploy the scheduler Worker

Fill in the real `database_id` in `workers/studio-scheduler/wrangler.toml`
first (same database as step A/E). Then:

```
npx wrangler deploy --config workers/studio-scheduler/wrangler.toml
```

Run from the repo root (so it can resolve `src/lib/*` and
`node_modules`). Then set the same GitHub secrets as step E on **this
Worker** too (Cloudflare dashboard → Workers → emmakwon-studio-scheduler
→ Settings → Variables and Secrets) — `GITHUB_TOKEN` as a secret, the
rest plaintext.

## G. Verify the Cron Trigger

`workers/studio-scheduler/wrangler.toml` already declares
`crons = ["*/5 * * * *"]` (every 5 minutes — this site publishes
roughly weekly, so this is comfortably inside free-tier limits). Cron
Triggers deploy automatically with `wrangler deploy` in step F — verify
it under Workers → emmakwon-studio-scheduler → **Triggers**.

## H. Verify the scheduler's D1 binding

Same dashboard page → **Bindings** → confirm `STUDIO_DB` is bound to
the same `emmakwon-studio` database as the Pages project's binding from
step E.

## I. Disposable end-to-end test

Only after A–H are all done. Write a real but disposable draft, Schedule
it a few minutes out, and watch `npx wrangler tail
emmakwon-studio-scheduler` to see it actually commit and flip to
published. Don't test with content you don't want published — a
successful test really does publish to the live site.
