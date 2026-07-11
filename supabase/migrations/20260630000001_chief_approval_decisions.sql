/*
 * ADR-002: V1 Auth Trust Boundary
 * Memberships is the authoritative source for all authorization decisions.
 * JWT claims are optimization hints only and must never be the sole enforcement mechanism.
 * This policy applies to tables within the v1 RLS boundary (organizations, profiles, memberships).
 * All operational business tables remain backend-mediated until promotion criteria are validated.
 * See: docs/decisions/ADR-002-auth-trust-boundary.md
 */

-- Chief approval decisions (persisted operator decisions on derived proposals)

create table public.chief_approval_decisions (
  proposal_id text primary key,
  status text not null check (status in ('approved', 'rejected', 'sent_back')),
  decided_at timestamptz not null default now(),
  actor text check (actor in ('founder', 'operator', 'observer'))
);

create index idx_chief_approval_decisions_decided_at
  on public.chief_approval_decisions (decided_at desc);

alter table public.chief_approval_decisions enable row level security;
