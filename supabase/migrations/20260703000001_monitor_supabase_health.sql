-- Supabase health monitor RPC (Tier 1 minimal)

create or replace function public.monitor_supabase_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connection_count integer;
  v_active_connections integer;
  v_table_stats jsonb;
begin
  select count(*) into v_connection_count
  from pg_stat_activity
  where datname = current_database();

  select count(*) into v_active_connections
  from pg_stat_activity
  where datname = current_database()
    and state = 'active';

  select coalesce(jsonb_agg(jsonb_build_object(
    'table_name', relname,
    'row_count', n_live_tup,
    'seq_scan', seq_scan,
    'idx_scan', idx_scan
  )), '[]'::jsonb)
  into v_table_stats
  from pg_stat_user_tables;

  return jsonb_build_object(
    'db_reachable', true,
    'connection_count', v_connection_count,
    'active_connections', v_active_connections,
    'table_stats', v_table_stats,
    'slow_queries', null
  );
end;
$$;

revoke execute on function public.monitor_supabase_health() from public;
grant execute on function public.monitor_supabase_health() to service_role;
