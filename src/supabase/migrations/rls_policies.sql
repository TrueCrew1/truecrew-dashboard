-- True Crew RLS policies
-- Run AFTER src/supabase/migrations/tables.sql

-- workflow_stages
create policy "workflow_stages_select_own"
  on public.workflow_stages for select
  using (auth.uid() = user_id);

create policy "workflow_stages_insert_own"
  on public.workflow_stages for insert
  with check (auth.uid() = user_id);

create policy "workflow_stages_update_own"
  on public.workflow_stages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workflow_stages_delete_own"
  on public.workflow_stages for delete
  using (auth.uid() = user_id);

-- tools
create policy "tools_select_own"
  on public.tools for select
  using (auth.uid() = user_id);

create policy "tools_insert_own"
  on public.tools for insert
  with check (auth.uid() = user_id);

create policy "tools_update_own"
  on public.tools for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tools_delete_own"
  on public.tools for delete
  using (auth.uid() = user_id);

-- workflows
create policy "workflows_select_own"
  on public.workflows for select
  using (auth.uid() = user_id);

create policy "workflows_insert_own"
  on public.workflows for insert
  with check (auth.uid() = user_id);

create policy "workflows_update_own"
  on public.workflows for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workflows_delete_own"
  on public.workflows for delete
  using (auth.uid() = user_id);

-- tasks
create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- incidents
create policy "incidents_select_own"
  on public.incidents for select
  using (auth.uid() = user_id);

create policy "incidents_insert_own"
  on public.incidents for insert
  with check (auth.uid() = user_id);

create policy "incidents_update_own"
  on public.incidents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "incidents_delete_own"
  on public.incidents for delete
  using (auth.uid() = user_id);

-- customers
create policy "customers_select_own"
  on public.customers for select
  using (auth.uid() = user_id);

create policy "customers_insert_own"
  on public.customers for insert
  with check (auth.uid() = user_id);

create policy "customers_update_own"
  on public.customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "customers_delete_own"
  on public.customers for delete
  using (auth.uid() = user_id);
