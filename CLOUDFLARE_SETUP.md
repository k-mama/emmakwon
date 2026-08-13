# Studio Publishing — Manual Setup

Phase 3 code is complete and locally verified (see the final report in the
conversation that shipped it), but it cannot go live until you complete
the steps below in your own Cloudflare and GitHub accounts. None of this
can be done from the repository alone — these are real account-level
resources.

**Until you complete section E (Cloudflare Access), do not complete
section D (GitHub token).** An admin without Access protection but with
a working GitHub token is an open door to your repository.

---

## A. Create the D1 database

```
npx wrangler d1 create emmakwon-studio
```

This prints a `database_id`. Copy it into **both**:

- `wrangler.toml` (repo root) — replace `REPLACE_WITH_REAL_D1_DATABASE_ID`
- `workers/studio-scheduler/wrangler.toml` — replace the same placeholder

Both must point at the **same** database — the Pages Functions and the
scheduler Worker share one `studio_posts` table.

## B. Apply the migrations to the real database

```
npx wrangler d1 execute STUDIO_DB --remote --file=migrations/0001_create_studio_posts.sql
npx wrangler d1 execute STUDIO_DB --remote --file=migrations/0002_seed_published_posts.sql
```

The seed file is idempotent (upserts by `id`) — safe to re-run any time
`src/content/studio-posts.json` changes (regenerate it first with
`node scripts/generate-studio-seed.mjs`).

## C. Bind D1 and set secrets on the Pages project

In the Cloudflare dashboard → your Pages project → **Settings → Functions**:

1. Add a **D1 database binding**: variable name `STUDIO_DB`, database
   `emmakwon-studio`.
2. Under **Environment variables**, add for the **Production** environment:

   | Name | Value | Type |
   |---|---|---|
   | `GITHUB_TOKEN` | *(from section D)* | **Secret** |
   | `GITHUB_OWNER` | `k-mama` | Plaintext |
   | `GITHUB_REPO` | `emmakwon` | Plaintext |
   | `GITHUB_BRANCH` | `main` | Plaintext |
   | `GITHUB_CONTENT_PATH` | `src/content/studio-posts.json` | Plaintext |
   | `NEXT_PUBLIC_ADMIN_PASSPHRASE` | *(your choice — see note below)* | Secret or plaintext, your call |

`GITHUB_TOKEN` **must** be added as a Secret, never plaintext.
`NEXT_PUBLIC_ADMIN_PASSPHRASE` is a UX deterrent only (see section E) —
it ships in the client bundle either way, so it doesn't matter which
type you pick for it.

## D. Create a fine-grained GitHub token

GitHub → Settings → Developer settings → **Fine-grained personal access
tokens** → Generate new token.

- **Repository access**: only `k-mama/emmakwon` (not all repos)
- **Permissions**: Repository → **Contents: Read and write**. Nothing else.
  Specifically do **not** grant Workflows permission — normal post
  publication only ever writes `src/content/studio-posts.json`, never a
  `.github/workflows/*` file, and the publisher code doesn't touch them.
- Copy the token once, paste it into the Pages secret from section C.
  GitHub won't show it again.

## E. Configure Cloudflare Access — the real security boundary

`NEXT_PUBLIC_ADMIN_PASSPHRASE` (already in the code) is **not** real
security for a static site — anything shipped to the browser is
readable in the bundle. The actual boundary is Cloudflare Access, gating
these paths to your own login only (single creator, no other identities):

Cloudflare dashboard → Zero Trust → Access → Applications → **Add an
application** → Self-hosted, and create **four** separate path rules
(a wildcard does not also protect its own parent path):

- `emmakwon.pages.dev/admin`
- `emmakwon.pages.dev/admin/*`
- `emmakwon.pages.dev/api/admin`
- `emmakwon.pages.dev/api/admin/*`

(adjust the domain if you're on a custom domain). Policy: allow only
your own email. Do not build additional users/roles — this is
intentionally single-creator.

## F. Deploy the scheduler Worker

```
npx wrangler deploy --config workers/studio-scheduler/wrangler.toml
```

Run from the repo root (so it can resolve `src/lib/*` and
`node_modules`). Then set the same secrets as section C on **this
Worker** too (Cloudflare dashboard → Workers → emmakwon-studio-scheduler
→ Settings → Variables and Secrets): `GITHUB_TOKEN` (secret),
`GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_CONTENT_PATH`.

## G. Confirm the Cron Trigger

`workers/studio-scheduler/wrangler.toml` already declares
`crons = ["*/5 * * * *"]` (every 5 minutes — this site publishes
roughly weekly, so this is comfortably inside free-tier limits). Cron
Triggers deploy automatically with `wrangler deploy` — verify it under
Workers → emmakwon-studio-scheduler → **Triggers** in the dashboard.

## H. Verify the Worker's D1 binding

Same dashboard page → **Bindings** → confirm `STUDIO_DB` is bound to the
same `emmakwon-studio` database as the Pages project. If you used the
wrangler.toml files from section A correctly, this should already be
correct — this step is just confirmation.

---

## After all of the above

Test with a real, disposable draft first — write it, Schedule it a few
minutes out, and watch the scheduler Worker's logs
(`npx wrangler tail emmakwon-studio-scheduler`) to see it actually
commit and flip to published. Don't test with content you don't want
published.
