-- True Crew initial schema

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (stored as text + check constraints for simpler migrations)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null check (category in ('api', 'frontend', 'worker', 'database', 'integration', 'internal_tool')),
  status text not null default 'unknown' check (status in ('healthy', 'degraded', 'down', 'maintenance', 'unknown')),
  environment text not null default 'production' check (environment in ('production', 'staging', 'preview', 'local')),
  owner text not null check (owner in ('founder', 'operator', 'observer')),
  url text,
  health_check_url text,
  github_repo text,
  deploy_method text not null default 'manual' check (deploy_method in ('github_actions', 'netlify', 'vercel', 'manual', 'other')),
  current_version text,
  last_deployed_at timestamptz,
  last_deploy_id uuid,
  runbook_id uuid,
  tags text[] not null default '{}',
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  description text not null default '',
  stage text not null check (stage in ('Inbox', 'Triage', 'Planned', 'In Progress', 'Waiting', 'Review', 'Done', 'Logged')),
  workflow_type text not null check (workflow_type in ('build', 'deploy', 'repair', 'ticket', 'onboarding', 'decision')),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  assignee text check (assignee in ('founder', 'operator', 'observer')),
  due_at timestamptz,
  blocker text,
  github_ref text,
  github_repo text,
  github_issue_number integer,
  github_pr_number integer,
  github_head_sha text,
  obsidian_note_id text,
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gate_checks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  gate_key text not null,
  label text not null,
  required boolean not null default true,
  passed boolean not null default false,
  passed_at timestamptz,
  source text check (source in ('manual', 'github_webhook', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, gate_key)
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  type text not null check (type in ('build', 'deploy', 'repair', 'ticket', 'onboarding', 'decision')),
  stage text not null check (stage in ('Inbox', 'Triage', 'Planned', 'In Progress', 'Waiting', 'Review', 'Done', 'Logged')),
  owner text not null check (owner in ('founder', 'operator', 'observer')),
  summary text not null default '',
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_tasks (
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  primary key (workflow_id, task_id)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  severity smallint not null check (severity between 1 and 4),
  status text not null default 'open' check (status in ('open', 'mitigating', 'mitigated', 'resolved', 'post_mortem_filed')),
  service_id uuid references public.tools(id) on delete set null,
  service_name text not null,
  summary text not null default '',
  opened_at timestamptz not null default now(),
  mitigated_at timestamptz,
  resolved_at timestamptz,
  linked_repair_id uuid references public.workflows(id) on delete set null,
  runbook_id uuid,
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deploys (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  stage text not null check (stage in ('Inbox', 'Triage', 'Planned', 'In Progress', 'Waiting', 'Review', 'Done', 'Logged')),
  build_id uuid references public.workflows(id) on delete set null,
  build_title text not null default '',
  service_id uuid references public.tools(id) on delete set null,
  service_name text not null,
  environment text not null check (environment in ('production', 'staging', 'preview', 'local')),
  version text not null,
  github_ref text,
  rollback_plan text not null default '',
  deployed_at timestamptz,
  health_check_passed boolean,
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  slug text not null unique,
  tier text not null check (tier in ('starter', 'growth', 'enterprise')),
  stage text not null check (stage in ('Inbox', 'Triage', 'Planned', 'In Progress', 'Waiting', 'Review', 'Done', 'Logged')),
  primary_contact text not null,
  email text not null,
  health_score integer not null default 0 check (health_score between 0 and 100),
  status text not null check (status in ('prospect', 'onboarding', 'active', 'churned')),
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_checklist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  gate_key text not null,
  label text not null,
  required boolean not null default true,
  passed boolean not null default false,
  unique (customer_id, gate_key)
);

create table public.runbooks (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  service_id uuid references public.tools(id) on delete set null,
  service_name text not null,
  obsidian_path text not null,
  summary text not null default '',
  last_reviewed_at timestamptz,
  tags text[] not null default '{}',
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  category text not null,
  version text not null,
  content text not null,
  tags text[] not null default '{}',
  linked_workflow_types text[] not null default '{}',
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  type text not null check (type in ('build', 'deploy', 'incident', 'ticket', 'decision', 'onboarding')),
  obsidian_path text not null,
  summary text not null default '',
  source_task_id uuid references public.tasks(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_by text not null check (created_by in ('founder', 'operator', 'observer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.github_webhook_deliveries (
  delivery_id text primary key,
  event_type text not null,
  action text,
  repo text,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_tasks_stage on public.tasks(stage);
create index idx_tasks_github_repo_issue on public.tasks(github_repo, github_issue_number);
create index idx_tasks_github_pr on public.tasks(github_repo, github_pr_number);
create index idx_gate_checks_task on public.gate_checks(task_id);
create index idx_incidents_status on public.incidents(status);
create index idx_tools_status on public.tools(status);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger gate_checks_set_updated_at before update on public.gate_checks
  for each row execute function public.set_updated_at();
create trigger workflows_set_updated_at before update on public.workflows
  for each row execute function public.set_updated_at();
create trigger incidents_set_updated_at before update on public.incidents
  for each row execute function public.set_updated_at();
create trigger deploys_set_updated_at before update on public.deploys
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger tools_set_updated_at before update on public.tools
  for each row execute function public.set_updated_at();
create trigger runbooks_set_updated_at before update on public.runbooks
  for each row execute function public.set_updated_at();
create trigger prompts_set_updated_at before update on public.prompts
  for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (deny-by-default for client keys; service role bypasses)
-- ---------------------------------------------------------------------------

alter table public.tools enable row level security;
alter table public.tasks enable row level security;
alter table public.gate_checks enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.incidents enable row level security;
alter table public.deploys enable row level security;
alter table public.customers enable row level security;
alter table public.customer_checklist_items enable row level security;
alter table public.runbooks enable row level security;
alter table public.prompts enable row level security;
alter table public.notes enable row level security;
alter table public.audit_events enable row level security;
alter table public.github_webhook_deliveries enable row level security;

-- ---------------------------------------------------------------------------
-- Gate helpers
-- ---------------------------------------------------------------------------

create or replace function public.pass_gate(
  p_task_id uuid,
  p_gate_key text,
  p_source text default 'system'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gate_checks
  set passed = true,
      passed_at = coalesce(passed_at, now()),
      source = p_source,
      updated_at = now()
  where task_id = p_task_id
    and gate_key = p_gate_key
    and passed = false;
end;
$$;

create or replace function public.fail_gate(
  p_task_id uuid,
  p_gate_key text,
  p_source text default 'system'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gate_checks
  set passed = false,
      passed_at = null,
      source = p_source,
      updated_at = now()
  where task_id = p_task_id
    and gate_key = p_gate_key;
end;
$$;
