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
