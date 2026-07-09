-- Librarian / Obsidian Agent runtime v1 — work item, job, artifact, sink delivery

create table public.runtime_work_items (
  id uuid primary key default gen_random_uuid(),
  agent_role text not null check (agent_role = 'librarian'),
  trigger_type text not null check (trigger_type in ('manual', 'reactive', 'scheduled')),
  input_kind text not null check (input_kind in ('chief_decision')),
  input_payload jsonb not null default '{}',
  status text not null check (
    status in ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  idempotency_key text unique,
  requested_by text not null check (
    requested_by in ('founder', 'operator', 'observer', 'system')
  ),
  chief_proposal_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_runtime_work_items_agent_status_created
  on public.runtime_work_items (agent_role, status, created_at desc);

create index idx_runtime_work_items_chief_proposal
  on public.runtime_work_items (chief_proposal_id)
  where chief_proposal_id is not null;

create table public.runtime_execution_jobs (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.runtime_work_items (id) on delete cascade,
  status text not null check (status in ('pending', 'running', 'succeeded', 'failed')),
  passes jsonb not null default '[]',
  runner text not null,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index idx_runtime_execution_jobs_work_item
  on public.runtime_execution_jobs (work_item_id, started_at desc);

create table public.runtime_artifacts (
  id uuid primary key default gen_random_uuid(),
  execution_job_id uuid not null references public.runtime_execution_jobs (id) on delete cascade,
  artifact_kind text not null check (artifact_kind in ('obsidian_note', 'index_row')),
  uri text not null,
  content_hash text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_runtime_artifacts_execution_job
  on public.runtime_artifacts (execution_job_id);

create table public.runtime_sink_deliveries (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.runtime_artifacts (id) on delete cascade,
  sink text not null check (sink in ('obsidian', 'supabase_notes')),
  status text not null check (status in ('delivered', 'failed', 'skipped')),
  delivered_at timestamptz not null default now(),
  details jsonb not null default '{}'
);

create index idx_runtime_sink_deliveries_artifact
  on public.runtime_sink_deliveries (artifact_id);

alter table public.runtime_work_items enable row level security;
alter table public.runtime_execution_jobs enable row level security;
alter table public.runtime_artifacts enable row level security;
alter table public.runtime_sink_deliveries enable row level security;
