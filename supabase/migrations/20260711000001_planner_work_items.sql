-- Planner work items — internal planning task tracker.
--
-- This is a standalone feature table, unrelated to the agent-runtime job
-- queue (public.runtime_work_items, agent_role = 'planner') used by the
-- Planner/Obsidian Agent pipeline. Kept separate deliberately: the runtime
-- queue's status/payload shape (queued/running/completed jsonb input_payload)
-- is a different concept from a human-facing task tracker, and this table
-- must not collide with the Librarian/Maintenance/Planner agent plumbing
-- that already reads/writes runtime_work_items.

create table public.planner_work_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'blocked', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee text,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_planner_work_items_status on public.planner_work_items(status);

create trigger planner_work_items_set_updated_at before update on public.planner_work_items
  for each row execute function public.set_updated_at();

-- Deny-by-default for client keys; service role (used by all /api routes
-- via getSupabaseAdmin()) bypasses RLS.
alter table public.planner_work_items enable row level security;
