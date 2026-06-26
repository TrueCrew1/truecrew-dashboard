-- Today workspace: site, crew, SLA fields + client access policies

alter table public.tasks
  add column if not exists site text not null default 'production'
    check (site in ('production', 'staging', 'internal')),
  add column if not exists crew text not null default 'platform'
    check (crew in ('platform', 'support', 'founder', 'operator')),
  add column if not exists sla_tier text not null default 'p2'
    check (sla_tier in ('p0', 'p1', 'p2', 'p3')),
  add column if not exists sla_due_at timestamptz,
  add column if not exists is_mit boolean not null default false;

-- Backfill seed tasks with operational metadata
update public.tasks set
  site = 'production',
  crew = case assignee
    when 'operator' then 'support'
    when 'founder' then 'founder'
    else 'platform'
  end,
  sla_tier = case priority
    when 'critical' then 'p0'
    when 'high' then 'p1'
    when 'medium' then 'p2'
    else 'p3'
  end,
  sla_due_at = case
    when due_at is not null then due_at
    when priority = 'critical' then now() + interval '4 hours'
    when priority = 'high' then now() + interval '24 hours'
    when priority = 'medium' then now() + interval '72 hours'
    else now() + interval '7 days'
  end,
  is_mit = (legacy_id = 'task-004')
where legacy_id in ('task-001', 'task-002', 'task-003', 'task-004');

-- Overdue example for task-002 (Waiting with past SLA)
update public.tasks set
  sla_due_at = now() - interval '2 days'
where legacy_id = 'task-002';

-- RLS policies for Today workspace (anon client reads/writes until auth ships)
create policy "tasks_select_anon"
  on public.tasks for select
  to anon, authenticated
  using (true);

create policy "tasks_insert_anon"
  on public.tasks for insert
  to anon, authenticated
  with check (true);

create policy "tasks_update_anon"
  on public.tasks for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "gate_checks_select_anon"
  on public.gate_checks for select
  to anon, authenticated
  using (true);
