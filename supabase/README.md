# Supabase

Postgres schema and migrations for True Crew. Apply with `npm run db:push` or run files in
`migrations/` via the Supabase SQL editor (see [docs/VERCEL_SUPABASE_SETUP.md](../docs/VERCEL_SUPABASE_SETUP.md)).

## Migrations

| File | Purpose |
|---|---|
| `20260626000001_initial_schema.sql` | Core tables, indexes, RLS (deny-by-default), gate helpers |
| `20260626000002_seed_data.sql` | Development seed data |
| `20260630000001_chief_approval_decisions.sql` | Chief approval decision persistence |
| `20260703000001_monitor_supabase_health.sql` | Health monitor RPC |

## Auth and RLS

Auth and RLS follow ADR-002 (V1 Auth Trust Boundary): memberships authoritative;
organizations/profiles/memberships under v1 RLS; operational tables backend-only
until promotion criteria are met. See [docs/decisions/ADR-002-auth-trust-boundary.md](../docs/decisions/ADR-002-auth-trust-boundary.md).

## Future auth/RLS direction

This section records implementation intent only. It does not change the current v1
boundary or introduce live policies.

- **ADR-002 remains the active v1 trust boundary.** Only `organizations`, `profiles`,
  and `memberships` are in scope for direct-client RLS at launch; operational tables stay
  backend-mediated until promotion criteria in ADR-002 are met.
- **Memberships remain authoritative for enforcement.** Every access decision — read or
  write — must resolve against live membership rows. No policy or backend check may treat
  JWT contents as sufficient proof of role or org scope.
- **JWT/custom claims may be added later for UX and routing.** Cached org id, role hints,
  or feature flags in the token can speed up frontend navigation and reduce round-trips,
  but they are optimization hints only — never the sole authorization mechanism.
- **Centralized SQL helper is the preferred RLS pattern for promoted tables.** When
  operational tables move under RLS, use a shared `authorize(...)` function (see
  `snippets/future-authorize-helper.sql`) so policy definitions stay thin and logic is not
  duplicated across per-table policies.
- **Destructive writes and role changes always use live membership checks.** Even after
  claims are introduced, `DELETE`, privilege escalation, membership mutations, and org
  context switches must re-query `memberships` — claims must not short-circuit these paths.

Design sketch (non-active): [`snippets/future-authorize-helper.sql`](snippets/future-authorize-helper.sql)
