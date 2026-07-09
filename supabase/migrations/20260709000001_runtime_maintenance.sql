-- Maintenance/Operations agent runtime slice — widen shared runtime_work_items
-- check constraints to admit agent_role = 'maintenance' / input_kind = 'maintenance_task'.
-- Reuses the existing runtime_execution_jobs / runtime_artifacts / runtime_sink_deliveries
-- tables and the obsidian_note + supabase_notes sinks already used by the Librarian agent.

alter table public.runtime_work_items
  drop constraint if exists runtime_work_items_agent_role_check;

alter table public.runtime_work_items
  add constraint runtime_work_items_agent_role_check
  check (agent_role in ('librarian', 'maintenance'));

alter table public.runtime_work_items
  drop constraint if exists runtime_work_items_input_kind_check;

alter table public.runtime_work_items
  add constraint runtime_work_items_input_kind_check
  check (input_kind in ('chief_decision', 'maintenance_task'));
