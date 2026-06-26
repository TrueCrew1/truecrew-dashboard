# True Crew — Command Center

Premium desktop command center for running business operations end-to-end.

## Stack (canonical)

| Layer | Technology |
|---|---|
| **Host** | Vercel — Next.js App Router + serverless `/api` routes |
| **Database** | Supabase Postgres |
| **GitHub** | Webhooks → automatic gate updates |
| **Knowledge** | Obsidian Sync (Phase C) |

> Full setup guide: [docs/VERCEL_SUPABASE_SETUP.md](docs/VERCEL_SUPABASE_SETUP.md)  
> **Deploy now (5 min):** [docs/DEPLOY_NOW.md](docs/DEPLOY_NOW.md)

## Quick start

```bash
npm install
npm run dev              # Next.js dev server (mock data)
npm run dev:vercel       # UI + API (requires .env.local)
```

## Production deploy

1. Create Supabase project → `npm run db:push`
2. Import repo in Vercel → set env vars from `.env.example`
3. Add GitHub webhook → `/api/github/webhook`
4. Set `NEXT_PUBLIC_USE_LIVE_API=true`

## Environment variables

| Variable | Scope |
|---|---|
| `SUPABASE_URL` | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server |
| `GITHUB_WEBHOOK_SECRET` | Server |
| `NEXT_PUBLIC_USE_LIVE_API` | Client — set `true` for live Supabase reads |

## API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Integration status |
| `GET /api/data` | Full command center payload |
| `GET /api/tasks` | Tasks + gates |
| `POST /api/github/webhook` | PR/CI gate automation |

## App routes

| Path | Module |
|---|---|
| `/` | Command Center |
| `/today` | Today workspace |
| `/workspace` | Assigned Work |
| `/records` | Records |
| `/admin` | Administration |
| `/audit` | Audit Log |

## Workflow stages

Inbox → Triage → Planned → In Progress → Waiting → Review → Done → Logged

Mock seed data: `src/data/mockData.ts` · Supabase seed: `supabase/migrations/20260626000002_seed_data.sql`

## Legacy

- Monolithic HTML prototype: `index.legacy.html`
- Netlify config: `netlify.toml` (deprecated — use Vercel)
