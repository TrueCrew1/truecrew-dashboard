-- audit_events.entity_id was uuid-only, but not every real entity id is a
-- UUID — Chief approval proposal ids (e.g. "apr-pr-63", stableChiefId()
-- output) are plain strings, matching chief_approval_decisions.proposal_id
-- (text primary key). Widen entity_id to text so Chief approval decision
-- audit writes stop failing (silently, via the existing fail-open handling)
-- while existing UUID-shaped ids (tasks.id, runtime_work_items.id) keep
-- working unchanged — a text column accepts their existing values as-is.

alter table public.audit_events
  alter column entity_id type text using entity_id::text;
