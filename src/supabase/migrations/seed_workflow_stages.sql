-- True Crew default workflow stages
-- Run AFTER src/supabase/migrations/tables.sql
-- Seeds the 8 pipeline stages for new auth users automatically.

create or replace function public.seed_workflow_stages_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workflow_stages (user_id, name, slug, sort_order, is_terminal)
  values
    (p_user_id, 'Inbox',       'inbox',       1, false),
    (p_user_id, 'Triage',      'triage',      2, false),
    (p_user_id, 'Planned',     'planned',     3, false),
    (p_user_id, 'In Progress', 'in_progress', 4, false),
    (p_user_id, 'Waiting',     'waiting',     5, false),
    (p_user_id, 'Review',      'review',      6, false),
    (p_user_id, 'Done',        'done',        7, false),
    (p_user_id, 'Logged',      'logged',      8, true)
  on conflict (user_id, slug) do nothing;
end;
$$;

comment on function public.seed_workflow_stages_for_user(uuid) is
  'Inserts the default True Crew pipeline stages for a given auth user.';

-- Auto-seed stages when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_workflow_stages_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill stages for existing users (safe to re-run)
do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.seed_workflow_stages_for_user(u.id);
  end loop;
end;
$$;
