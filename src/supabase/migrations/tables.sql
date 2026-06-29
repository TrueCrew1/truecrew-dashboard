-- True Crew core tables
-- Run in Supabase Dashboard → SQL Editor, or via CLI (see bottom of file).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- workflow_stages
-- Canonical pipeline stages shared across tasks and workflows (Inbox → Logged).
-- ---------------------------------------------------------------------------

create table public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

comment on table public.workflow_stages is
  'Lookup table for operational pipeline stages (Inbox, Triage, Planned, etc.) scoped per user.';

comment on column public.workflow_stages.slug is
  'URL-safe identifier for the stage, e.g. inbox, in_progress.';

-- ---------------------------------------------------------------------------
-- tools
-- Services, apps, and infrastructure the crew monitors and deploys.
-- ---------------------------------------------------------------------------

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'unknown'
    check (status in ('healthy', 'degraded', 'down', 'maintenance', 'unknown')),
  category text not null default 'internal_tool'
    check (category in ('api', 'frontend', 'worker', 'database', 'integration', 'internal_tool')),
  environment text not null default 'production'
    check (environment in ('production', 'staging', 'preview', 'local')),
  url text,
  health_check_url text,
  github_repo text,
  current_version text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

comment on table public.tools is
  'Registered services and tools (APIs, frontends, workers) tracked for health, deploys, and incidents.';

-- ---------------------------------------------------------------------------
-- workflows
-- Multi-step operational workflows: builds, deploys, repairs, tickets, etc.
-- ---------------------------------------------------------------------------

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null
    check (type in ('build', 'deploy', 'repair', 'ticket', 'onboarding', 'decision')),
  stage_id uuid not null references public.workflow_stages (id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'cancelled')),
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workflows is
  'Top-level operational workflows grouping related tasks through a pipeline stage.';

-- ---------------------------------------------------------------------------
-- tasks
-- Individual work items moving through the pipeline.
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid references public.workflows (id) on delete set null,
  stage_id uuid not null references public.workflow_stages (id) on delete restrict,
  title text not null,
  description text not null default '',
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority text not null default 'medium'
    check (priority in ('critical', 'high', 'medium', 'low')),
  due_at timestamptz,
  blocker text,
  github_repo text,
  github_issue_number integer,
  github_pr_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tasks is
  'Atomic work items assigned to a pipeline stage and optionally linked to a workflow.';

-- ---------------------------------------------------------------------------
-- incidents
-- Production incidents tied to affected tools/services.
-- ---------------------------------------------------------------------------

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_id uuid references public.tools (id) on delete set null,
  workflow_id uuid references public.workflows (id) on delete set null,
  title text not null,
  status text not null default 'open'
    check (status in ('open', 'mitigating', 'mitigated', 'resolved', 'post_mortem_filed')),
  severity smallint not null check (severity between 1 and 4),
  summary text not null default '',
  opened_at timestamptz not null default now(),
  mitigated_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.incidents is
  'Active and historical production incidents with severity, status, and linked repair workflows.';

-- ---------------------------------------------------------------------------
-- customers
-- Customer accounts tracked for onboarding, health, and support.
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage_id uuid references public.workflow_stages (id) on delete set null,
  name text not null,
  slug text not null,
  status text not null default 'prospect'
    check (status in ('prospect', 'onboarding', 'active', 'churned')),
  tier text not null default 'starter'
    check (tier in ('starter', 'growth', 'enterprise')),
  primary_contact text not null,
  email text not null,
  health_score integer not null default 0 check (health_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

comment on table public.customers is
  'Customer records with onboarding stage, tier, contact info, and health score.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_workflow_stages_user on public.workflow_stages (user_id);
create index idx_tools_user_status on public.tools (user_id, status);
create index idx_workflows_user_stage on public.workflows (user_id, stage_id);
create index idx_tasks_user_stage on public.tasks (user_id, stage_id);
create index idx_tasks_workflow on public.tasks (workflow_id);
create index idx_incidents_user_status on public.incidents (user_id, status);
create index idx_customers_user_status on public.customers (user_id, status);

-- ---------------------------------------------------------------------------
-- updated_at trigger
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

create trigger workflow_stages_set_updated_at
  before update on public.workflow_stages
  for each row execute function public.set_updated_at();

create trigger tools_set_updated_at
  before update on public.tools
  for each row execute function public.set_updated_at();

create trigger workflows_set_updated_at
  before update on public.workflows
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger incidents_set_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security (deny-by-default; add policies when wiring client access)
-- ---------------------------------------------------------------------------

alter table public.workflow_stages enable row level security;
alter table public.tools enable row level security;
alter table public.workflows enable row level security;
alter table public.tasks enable row level security;
alter table public.incidents enable row level security;
alter table public.customers enable row level security;

-- ---------------------------------------------------------------------------
-- Run order (Supabase SQL Editor)
-- ---------------------------------------------------------------------------
-- 1. Paste and run this file (tables.sql)
-- 2. Paste and run src/supabase/migrations/rls_policies.sql
-- 3. Paste and run src/supabase/migrations/seed_workflow_stages.sql
--
-- CLI alternative:
--   supabase db execute --file src/supabase/migrations/tables.sql
--   supabase db execute --file src/supabase/migrations/rls_policies.sql
--   supabase db execute --file src/supabase/migrations/seed_workflow_stages.sql
