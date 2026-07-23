# True Crew — Command Center

Command center for operations and maintenance teams — run the day from the field.

## Stack (canonical)

| Layer | Technology |
|---|---|
| **Host** | Vercel — SPA + serverless `/api` routes |
| **Database** | Supabase Postgres |
| **GitHub** | Webhooks → automatic gate updates |
| **Knowledge** | Obsidian Sync (Phase C) |

> Full setup: [docs/VERCEL_SUPABASE_SETUP.md](docs/VERCEL_SUPABASE_SETUP.md) · [docs/DEPLOY_NOW.md](docs/DEPLOY_NOW.md) · [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md)

## Prerequisites

- Node.js **22** and npm (matches CI)
- For API routes locally: a filled `.env.local` (from `.env.example`) and `npm run dev:vercel`

## Quick start

```bash
git clone https://github.com/TrueCrew1/truecrew-dashboard.git
cd truecrew-dashboard
cp .env.example .env.local   # fill placeholders — never commit real secrets
npm install
npm run dev                  # UI only (mock data)
# npm run dev:vercel         # UI + /api (needs .env.local)
```

## Verify (is this repo clean?)

```bash
npm run verify               # lint + test + build
```

Same checks run in CI on PRs to `main` and pushes to `main` / `cursor/**`.

Ship checklist for agents/approvers: [docs/SHIP_CHECKLIST.md](docs/SHIP_CHECKLIST.md).

## Production deploy

1. Create Supabase project → `npm run db:push`
2. Import repo in Vercel → set env vars from `.env.example`
3. Add GitHub webhook → `/api/github/webhook`
4. Set `VITE_USE_LIVE_API=true`

## Environment variables

| Variable | Scope |
|---|---|
| `SUPABASE_URL` | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server |
| `GITHUB_WEBHOOK_SECRET` | Server |
| `VITE_USE_LIVE_API` | Client — set `true` for live Supabase reads |

See `.env.example` for the full list (auth, LLM, Obsidian, Slack).

## API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Integration status |
| `GET /api/data` | Full command center payload |
| `GET /api/tasks` | Tasks + gates |
| `GET /api/obsidian/notes` | Vault note list (local dev) |
| `POST /api/librarian/artifacts` | Create task-linked Obsidian artifact index |
| `GET /api/tasks/:id/artifacts` | List Librarian artifacts for a task |

## App routes

| Path | Module |
|---|---|
| `/` | Today |
| `/dashboard` | Dashboard |
| `/operations` | Operations |
| `/builds` | Builds |
| `/monitor` | Monitor |
| `/repair` | Repair |
| `/customers` | Customers |
| `/knowledge` | AI & Knowledge |
| `/review` | Review |
| `/settings` | Settings |

## Workflow stages

Inbox → Triage → Planned → In Progress → Waiting → Review → Done → Logged

Mock seed data: `src/data/mockData.ts` · Supabase seed: `supabase/migrations/20260626000002_seed_data.sql`

## Reference

- Agent context: [CLAUDE.md](CLAUDE.md)
- Hygiene / branch triage snapshot (2026-07-22): [docs/REPO_TRIAGE_SUMMARY.md](docs/REPO_TRIAGE_SUMMARY.md)

## Legacy

- Monolithic HTML prototype: `index.legacy.html`
- Netlify config: `netlify.toml` (deprecated — use Vercel)
