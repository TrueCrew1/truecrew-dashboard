-- Auth foundation: profiles, workflow_stages, RLS policies for authenticated clients

-- ---------------------------------------------------------------------------
-- Profiles (linked to Supabase Auth)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Workflow stages reference table
-- ---------------------------------------------------------------------------

create table if not exists public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order integer not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.workflow_stages enable row level security;

insert into public.workflow_stages (key, label, sort_order, description) values
  ('Inbox', 'Inbox', 1, 'Newly captured work awaiting triage'),
  ('Triage', 'Triage', 2, 'Being assessed for priority and routing'),
  ('Planned', 'Planned', 3, 'Scheduled and ready to start'),
  ('In Progress', 'In Progress', 4, 'Actively being worked'),
  ('Waiting', 'Waiting', 5, 'Blocked on external input'),
  ('Review', 'Review', 6, 'Awaiting verification or sign-off'),
  ('Done', 'Done', 7, 'Completed pending logging'),
  ('Logged', 'Logged', 8, 'Archived operational record')
on conflict (key) do nothing;

create policy "workflow_stages_select_authenticated"
  on public.workflow_stages for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Auth audit log (session events)
-- ---------------------------------------------------------------------------

create table if not exists public.auth_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  role text,
  actor_email text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.auth_audit_events enable row level security;

create policy "auth_audit_select_authenticated"
  on public.auth_audit_events for select
  to authenticated
  using (true);

create policy "auth_audit_insert_authenticated"
  on public.auth_audit_events for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- ---------------------------------------------------------------------------
-- RLS policies for operational tables (authenticated read/write)
-- ---------------------------------------------------------------------------

create policy "tasks_select_authenticated"
  on public.tasks for select to authenticated using (true);

create policy "tasks_insert_authenticated"
  on public.tasks for insert to authenticated with check (true);

create policy "tasks_update_authenticated"
  on public.tasks for update to authenticated using (true) with check (true);

create policy "gate_checks_select_authenticated"
  on public.gate_checks for select to authenticated using (true);

create policy "gate_checks_insert_authenticated"
  on public.gate_checks for insert to authenticated with check (true);

create policy "gate_checks_update_authenticated"
  on public.gate_checks for update to authenticated using (true) with check (true);

create policy "workflows_select_authenticated"
  on public.workflows for select to authenticated using (true);

create policy "workflows_insert_authenticated"
  on public.workflows for insert to authenticated with check (true);

create policy "workflows_update_authenticated"
  on public.workflows for update to authenticated using (true) with check (true);

create policy "incidents_select_authenticated"
  on public.incidents for select to authenticated using (true);

create policy "incidents_insert_authenticated"
  on public.incidents for insert to authenticated with check (true);

create policy "incidents_update_authenticated"
  on public.incidents for update to authenticated using (true) with check (true);

create policy "tools_select_authenticated"
  on public.tools for select to authenticated using (true);

create policy "tools_insert_authenticated"
  on public.tools for insert to authenticated with check (true);

create policy "tools_update_authenticated"
  on public.tools for update to authenticated using (true) with check (true);

create policy "customers_select_authenticated"
  on public.customers for select to authenticated using (true);

create policy "customers_insert_authenticated"
  on public.customers for insert to authenticated with check (true);

create policy "customers_update_authenticated"
  on public.customers for update to authenticated using (true) with check (true);

create policy "audit_events_select_authenticated"
  on public.audit_events for select to authenticated using (true);

create policy "audit_events_insert_authenticated"
  on public.audit_events for insert to authenticated with check (true);

-- ---------------------------------------------------------------------------
-- New user profile bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_app_meta_data->>'role', 'employee')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
