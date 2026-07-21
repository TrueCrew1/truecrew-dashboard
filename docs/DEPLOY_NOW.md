# Deploy True Crew in 5 minutes

PR #3 is merged to `main`. Complete these steps once — then every push to `main` auto-deploys via GitHub Actions.

## Step 1 — Supabase (2 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name: `true-crew` · Region: closest to you · Save the database password
3. Open **SQL Editor** → **New query**
4. Paste the entire contents of `supabase/combined_migration.sql` → **Run**
5. Copy from **Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   - `anon` key → `VITE_SUPABASE_ANON_KEY`

## Step 2 — Vercel (2 min)

1. Go to [vercel.com/new](https://vercel.com/new) → Import `TrueCrew1/truecrew-dashboard`
2. Framework: **Vite** (auto-detected)
3. Add environment variables (Production + Preview):

| Name | Value |
|---|---|
| `SUPABASE_URL` | From Step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | From Step 1 |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | From Step 1 |
| `VITE_USE_LIVE_API` | `true` |
| `INTERNAL_API_SECRET` | Generate: `openssl rand -hex 32` |
| `VITE_INTERNAL_KEY` | Same value as `INTERNAL_API_SECRET` |
| `GITHUB_WEBHOOK_SECRET` | Generate: `openssl rand -hex 32` |
| `SLACK_WEBHOOK_URL` | Optional — outbound governed notify / turnover |
| `VERCEL_API_TOKEN` | Optional — Monitor deploy probe (`/api/monitor?target=vercel`) |
| `VERCEL_PROJECT_ID` | Optional — pairs with `VERCEL_API_TOKEN` (app runtime) |

> **Naming note:** App Monitor uses `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID`. GitHub Actions deploy (Step 3) uses a different token name: `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`. Do not set `OBSIDIAN_VAULT_PATH` on Vercel (local-only).

4. Deploy → copy your production URL (e.g. `https://truecrew-dashboard.vercel.app`)

## Step 3 — GitHub Actions secrets (1 min)

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel project → Settings → General → **Project ID** section, or `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | Same as above |
| `SUPABASE_URL` | Step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 1 |
| `VITE_SUPABASE_URL` | Step 1 |
| `VITE_SUPABASE_ANON_KEY` | Step 1 |
| `GITHUB_WEBHOOK_SECRET` | Same value as Vercel env var |
| `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | Supabase project URL: `https://<REF>.supabase.co` |

Then: **Actions → Deploy to Vercel → Run workflow**

## Step 4 — GitHub webhook (1 min)

Repo → **Settings → Webhooks → Add webhook**

| Field | Value |
|---|---|
| URL | `https://YOUR_VERCEL_URL/api/github/webhook` |
| Secret | Same as `GITHUB_WEBHOOK_SECRET` |
| Events | Pull requests, Check runs, Check suites |

## Step 5 — Disable GitHub Pages (optional)

GitHub Pages cannot run Vercel API routes. In repo **Settings → Pages**, set source to **None** to avoid conflicting deploys.

## Verify

```bash
curl https://YOUR_VERCEL_URL/api/health
# → {"ok":true,"host":"vercel","supabase":true,...}

curl https://YOUR_VERCEL_URL/api/data
# → tasks, incidents, tools, ...
```

Open the app → **Settings** should show Supabase connected.

## CLI shortcut (if you have tokens locally)

```bash
export VERCEL_TOKEN=...
export SUPABASE_ACCESS_TOKEN=...
npx vercel login   # or use token
npx vercel --prod
```
