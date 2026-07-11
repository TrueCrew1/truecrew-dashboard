/*
 * FUTURE DESIGN SKETCH ONLY — NOT USED IN PRODUCTION
 *
 * This file documents a proposed centralized authorization helper for when
 * operational tables are promoted under RLS (per ADR-002 promotion criteria).
 * No migration depends on this file. Do not apply to a live database without
 * a reviewed migration and security sign-off.
 *
 * See: docs/decisions/ADR-002-auth-trust-boundary.md
 * See: supabase/README.md § Future auth/RLS direction
 */

-- ---------------------------------------------------------------------------
-- Proposed: authorize(p_action, p_org_id, p_resource?)
-- ---------------------------------------------------------------------------
-- Returns true when the calling user (auth.uid()) has the required membership
-- for the requested action in the given organization. Always queries live
-- membership rows — never reads JWT claims for enforcement.
--
-- p_action:  'select' | 'insert' | 'update' | 'delete' | 'manage_members'
-- p_org_id:  organization scope for the row or operation
-- p_resource: optional table/column hint for fine-grained rules later
--
-- Pseudocode outline (commented — not executable as-is):

/*
create or replace function public.authorize(
  p_action text,
  p_org_id uuid,
  p_resource text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
begin
  if v_user_id is null then
    return false;
  end if;

  -- Authoritative check: live membership row, not JWT claims
  select m.role into v_role
  from public.memberships m
  where m.user_id = v_user_id
    and m.organization_id = p_org_id
    and m.status = 'active';

  if v_role is null then
    return false;
  end if;

  -- Destructive writes and role changes: always re-check membership (no claim bypass)
  if p_action in ('delete', 'manage_members') then
    -- require elevated role; re-query above already enforced live row
    return v_role in ('owner', 'admin');
  end if;

  if p_action = 'update' then
    return v_role in ('owner', 'admin', 'supervisor', 'member');
  end if;

  if p_action in ('select', 'insert') then
    return v_role in ('owner', 'admin', 'supervisor', 'member', 'viewer');
  end if;

  return false;
end;
$$;

-- Example thin RLS policy (future, on a promoted operational table):
--
-- create policy "work_orders_select"
--   on public.work_orders
--   for select
--   to authenticated
--   using (public.authorize('select', organization_id));
--
-- create policy "work_orders_update"
--   on public.work_orders
--   for update
--   to authenticated
--   using (public.authorize('update', organization_id))
--   with check (public.authorize('update', organization_id));
*/

-- JWT/custom claims (future, UX only — not referenced by authorize()):
--   - current_organization_id  → frontend routing, org switcher pre-selection
--   - role_hint                → display labels, nav visibility (re-validate server-side)
-- Claims may drift; authorize() and backend handlers must not trust them.
