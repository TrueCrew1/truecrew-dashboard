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

-- Chief approval decisions (persisted operator decisions on derived proposals)
create table public.chief_approval_decisions (
  proposal_id text primary key,
  status text not null check (status in ('approved', 'rejected', 'sent_back')),
  decided_at timestamptz not null default now(),
  actor text check (actor in ('founder', 'operator', 'observer'))
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
create index idx_chief_approval_decisions_decided_at
  on public.chief_approval_decisions (decided_at desc);

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
alter table public.chief_approval_decisions enable row level security;

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
-- Seed data aligned with frontend mock records and GitHub gate keys

insert into public.tools (legacy_id, name, slug, category, status, environment, owner, url, health_check_url, github_repo, deploy_method, current_version, tags, created_by)
values
  ('tool-001', 'Billing API', 'billing-api', 'api', 'healthy', 'production', 'founder', 'https://api.truecrew.io/billing', 'https://api.truecrew.io/billing/health', 'TrueCrew1/billing-api', 'github_actions', '2.4.0', array['customer-facing', 'revenue-critical'], 'founder'),
  ('tool-002', 'Auth Service', 'auth-service', 'api', 'degraded', 'production', 'founder', 'https://auth.truecrew.io', 'https://auth.truecrew.io/health', 'TrueCrew1/auth-service', 'netlify', '1.8.2', array['customer-facing', 'security'], 'founder'),
  ('tool-003', 'Webhook Worker', 'webhook-worker', 'worker', 'degraded', 'production', 'operator', null, null, 'TrueCrew1/webhook-worker', 'github_actions', '3.1.0', array['internal', 'async'], 'founder'),
  ('tool-004', 'Command Center', 'command-center', 'frontend', 'healthy', 'production', 'founder', 'https://app.truecrew.io', 'https://app.truecrew.io/health', 'TrueCrew1/truecrew-dashboard', 'vercel', '0.1.0', array['internal', 'operator-facing'], 'founder');

insert into public.tasks (legacy_id, title, description, stage, workflow_type, priority, assignee, blocker, github_ref, github_repo, github_issue_number, created_by)
values
  (
    'task-001',
    'Billing API rate limiter',
    'Add per-tenant rate limiting to the billing API endpoint.',
    'In Progress',
    'build',
    'high',
    'founder',
    null,
    'TrueCrew1/billing-api#142',
    'TrueCrew1/billing-api',
    142,
    'founder'
  ),
  (
    'task-002',
    'Acme Corp onboarding kickoff',
    'Complete kickoff call and provision tenant access.',
    'Waiting',
    'onboarding',
    'medium',
    'operator',
    'Customer legal review pending — expected by Friday',
    null,
    null,
    null,
    'operator'
  ),
  (
    'task-003',
    'Dashboard timeout on large datasets',
    'Customer report: dashboard hangs above 10k rows.',
    'Triage',
    'ticket',
    'high',
    null,
    null,
    null,
    null,
    null,
    'operator'
  ),
  (
    'task-004',
    'Q3 pricing model decision',
    'Choose between usage-based and seat-based pricing for growth tier.',
    'Review',
    'decision',
    'critical',
    'founder',
    null,
    null,
    null,
    null,
    'founder'
  );

insert into public.gate_checks (task_id, gate_key, label, required, passed, source)
select t.id, g.gate_key, g.label, g.required, g.passed, g.source
from public.tasks t
join (
  values
    ('task-001', 'acceptance_criteria', 'Acceptance criteria written', true, true, 'manual'),
    ('task-001', 'github_branch_linked', 'GitHub branch linked', true, true, 'manual'),
    ('task-001', 'pr_opened', 'PR opened and linked', true, false, null),
    ('task-002', 'kickoff_scheduled', 'Kickoff scheduled', true, true, 'manual'),
    ('task-002', 'access_provisioned', 'Access provisioned', true, false, null),
    ('task-003', 'source_confirmed', 'Source confirmed', true, true, 'manual'),
    ('task-003', 'category_assigned', 'Category assigned', true, false, null),
    ('task-004', 'options_documented', 'Options documented (min 2)', true, true, 'manual'),
    ('task-004', 'recommendation_written', 'Recommendation written', true, true, 'manual'),
    ('task-004', 'decision_recorded', 'Decision recorded', true, false, null)
) as g(legacy_task_id, gate_key, label, required, passed, source)
  on t.legacy_id = g.legacy_task_id;

insert into public.workflows (legacy_id, title, type, stage, owner, summary, created_by)
values
  ('wf-001', 'Billing API v2.4.1 build', 'build', 'In Progress', 'founder', 'Rate limiter, webhook retries, and invoice PDF export.', 'founder'),
  ('wf-002', 'Billing API production deploy', 'deploy', 'Planned', 'founder', 'Deploy v2.4.1 to production after build review passes.', 'founder'),
  ('wf-003', 'Auth service latency repair', 'repair', 'In Progress', 'operator', 'Mitigate elevated p99 latency on auth token validation.', 'operator');

insert into public.workflow_tasks (workflow_id, task_id)
select w.id, t.id
from public.workflows w
join public.tasks t on t.legacy_id = 'task-001'
where w.legacy_id = 'wf-001';

insert into public.incidents (legacy_id, title, severity, status, service_id, service_name, summary, linked_repair_id, created_by)
select
  'inc-001',
  'Auth p99 latency spike',
  2,
  'mitigating',
  tool.id,
  'Auth Service',
  'Token validation p99 exceeded 800ms for 12 minutes.',
  wf.id,
  'operator'
from public.tools tool
cross join public.workflows wf
where tool.legacy_id = 'tool-002'
  and wf.legacy_id = 'wf-003';

insert into public.incidents (legacy_id, title, severity, status, service_id, service_name, summary, created_by)
select
  'inc-002',
  'Webhook delivery backlog',
  3,
  'open',
  tool.id,
  'Webhook Worker',
  'Queue depth above 5k for 45 minutes. No customer reports yet.',
  'founder'
from public.tools tool
where tool.legacy_id = 'tool-003';

insert into public.deploys (legacy_id, title, stage, build_id, build_title, service_id, service_name, environment, version, github_ref, rollback_plan, health_check_passed, created_by)
select
  'deploy-001',
  'Billing API v2.4.1 → Production',
  'Planned',
  wf.id,
  'Billing API v2.4.1 build',
  tool.id,
  'Billing API',
  'production',
  '2.4.1',
  'TrueCrew1/billing-api@v2.4.1',
  'Revert to tag v2.4.0; run migration rollback script 0042.',
  null,
  'founder'
from public.workflows wf
cross join public.tools tool
where wf.legacy_id = 'wf-001'
  and tool.legacy_id = 'tool-001';

insert into public.customers (legacy_id, name, slug, tier, stage, primary_contact, email, health_score, status, created_by)
values
  ('cust-001', 'Acme Corp', 'acme-corp', 'enterprise', 'Waiting', 'Jordan Lee', 'jordan@acme.example', 72, 'onboarding', 'operator'),
  ('cust-002', 'Northwind Labs', 'northwind-labs', 'growth', 'Inbox', 'Sam Rivera', 'sam@northwind.example', 88, 'active', 'founder'),
  ('cust-003', 'Brightpath Studio', 'brightpath-studio', 'starter', 'Done', 'Alex Chen', 'alex@brightpath.example', 95, 'active', 'operator');

insert into public.customer_checklist_items (customer_id, gate_key, label, required, passed)
select c.id, i.gate_key, i.label, i.required, i.passed
from public.customers c
join (
  values
    ('cust-001', 'kickoff_completed', 'Kickoff completed', true, true),
    ('cust-001', 'tenant_provisioned', 'Tenant provisioned', true, false),
    ('cust-001', 'success_criteria_confirmed', 'Success criteria confirmed', true, false)
) as i(legacy_customer_id, gate_key, label, required, passed)
  on c.legacy_id = i.legacy_customer_id;

insert into public.runbooks (legacy_id, title, service_id, service_name, obsidian_path, summary, tags, created_by)
select
  rb.legacy_id,
  rb.title,
  tool.id,
  rb.service_name,
  rb.obsidian_path,
  rb.summary,
  rb.tags,
  'founder'
from (
  values
    ('rb-001', 'Billing API — Production Runbook', 'tool-001', 'Billing API', 'Operations/Runbooks/Billing API.md', 'Deploy, rollback, and incident response for billing endpoints.', array['api', 'revenue-critical']),
    ('rb-002', 'Auth Service — Latency Triage', 'tool-002', 'Auth Service', 'Operations/Runbooks/Auth Service Latency.md', 'Steps for diagnosing and mitigating auth latency spikes.', array['api', 'security']),
    ('rb-003', 'Webhook Worker — Queue Backlog', 'tool-003', 'Webhook Worker', 'Operations/Runbooks/Webhook Worker Backlog.md', 'Scale workers and drain backlog safely.', array['worker', 'async'])
) as rb(legacy_id, title, tool_legacy_id, service_name, obsidian_path, summary, tags)
join public.tools tool on tool.legacy_id = rb.tool_legacy_id;

insert into public.prompts (legacy_id, title, category, version, content, tags, linked_workflow_types, created_by)
values
  ('prompt-001', 'Incident post-mortem draft', 'Operations', '1.2', 'Draft a post-mortem for incident {incident_id}. Include timeline, root cause, and preventive actions.', array['incident', 'obsidian'], array['repair'], 'founder'),
  ('prompt-002', 'Build acceptance criteria', 'Engineering', '1.0', 'Write acceptance criteria for: {feature_title}. Format as Given/When/Then bullets.', array['build', 'planning'], array['build'], 'founder'),
  ('prompt-003', 'Customer onboarding summary', 'Customer Success', '1.1', 'Summarize onboarding for {customer_name}. Include checklist status and open blockers.', array['onboarding', 'obsidian'], array['onboarding'], 'operator');

insert into public.notes (legacy_id, title, type, obsidian_path, summary, synced_at, created_by)
values
  ('note-001', '2026-06-20 — Billing API v2.4.0 deploy', 'deploy', 'Operations/Deploys/2026-06-20 — Billing API — 2.4.0.md', 'Production deploy completed. Health checks green.', now() - interval '10 days', 'founder'),
  ('note-002', 'Brightpath Studio — Onboarding Summary', 'onboarding', 'Customers/Brightpath Studio/Onboarding Summary.md', 'Onboarding completed in 5 days. Health baseline set at 95.', now() - interval '30 days', 'operator'),
  ('note-003', 'Q2 pricing review decision', 'decision', 'Decisions/2026-04-01 — Q2 pricing review.md', 'Retained seat-based pricing for starter tier.', now() - interval '90 days', 'founder');
