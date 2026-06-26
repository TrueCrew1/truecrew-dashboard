# True Crew — Next.js + Supabase Foundation

Operational command center rebuilt on **Next.js 15 (App Router)** with **Supabase Auth** and Postgres.

## Stack

| Layer | Technology |
|---|---|
| **App** | Next.js 15 + TypeScript (App Router) |
| **Auth** | Supabase Auth (email/password) |
| **Database** | Supabase Postgres |
| **Legacy SPA** | Vite + React (still in repo; `npm run dev:vite`) |

## Quick start

```bash
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run db:push          # Apply migrations (includes auth foundation)
npm run dev              # Next.js dev server → http://localhost:3000
```

## Environment variables

| Variable | Scope | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | For webhooks/admin scripts |

## App routes

| Path | Page |
|---|---|
| `/` | Command Center |
| `/today` | Today workspace (live tasks from Supabase) |
| `/workspace` | Assigned Work |
| `/records` | Records |
| `/admin` | Administration (admin role only) |
| `/audit` | Audit Log |
| `/login` | Sign in |
| `/signup` | Create account |

## Database tables

Core (from initial migration): `tasks`, `workflows`, `incidents`, `tools`, `customers`, `gate_checks`, …

Auth foundation migration (`20260626000003_auth_foundation.sql`):
- `profiles` — user role (`admin` / `employee`)
- `workflow_stages` — reference stage definitions
- `auth_audit_events` — sign-in/out and audit trail
- RLS policies for authenticated read/write

## Promote a user to admin

After signup, in Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Or set `role` in `auth.users.raw_app_meta_data` before first login.

## Seed data

Optional demo rows: `supabase/migrations/20260626000002_seed_data.sql` (applied with `db:push`).
