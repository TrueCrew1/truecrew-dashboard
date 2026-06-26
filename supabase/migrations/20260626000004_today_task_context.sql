-- Today workspace context: site, crew, SLA on tasks

alter table public.tasks
  add column if not exists site_name text,
  add column if not exists crew text check (crew in ('field', 'maintenance', 'operations', 'admin')),
  add column if not exists sla_tier text default 'standard'
    check (sla_tier in ('critical', 'standard', 'routine')),
  add column if not exists waiting_on text;

create index if not exists idx_tasks_site_name on public.tasks(site_name);
create index if not exists idx_tasks_crew on public.tasks(crew);
create index if not exists idx_tasks_sla_tier on public.tasks(sla_tier);
create index if not exists idx_tasks_due_at on public.tasks(due_at);

-- Enrich seed tasks for Today filters and zones
update public.tasks set
  site_name = 'HQ — Platform',
  crew = 'operations',
  sla_tier = 'standard',
  due_at = now() + interval '2 days'
where legacy_id = 'task-001';

update public.tasks set
  site_name = 'Site A — Acme Corp',
  crew = 'admin',
  sla_tier = 'standard',
  waiting_on = 'Customer legal review',
  due_at = now() + interval '1 day'
where legacy_id = 'task-002';

update public.tasks set
  site_name = 'HQ — Platform',
  crew = 'operations',
  sla_tier = 'critical',
  due_at = now() - interval '1 day'
where legacy_id = 'task-003';

update public.tasks set
  site_name = 'HQ — Platform',
  crew = 'admin',
  sla_tier = 'critical',
  due_at = now() + interval '3 hours'
where legacy_id = 'task-004';
