# Today Work Orders Read Model

## Purpose

- Defines the backend-owned response shape for the future multi-tenant **Today** dashboard
  (`TodayPage` / work-order scaffold) — a single org-scoped read model, not per-widget fetches.
- Under [ADR-002](../decisions/ADR-002-auth-trust-boundary.md), `work_orders` and related
  operational data remain **backend-mediated** for v1; this contract describes what the server
  returns after enforcing membership context, not what the client reads directly from Postgres.
- Aligns UI scaffolding with a server-owned aggregation layer so the page can swap from
  placeholders to live data without redesigning section layout or assuming raw table access.

## Intended response sections

The Today dashboard response is one document with these top-level sections:

- **Org context** — current organization and caller's membership role for the session.
- **KPI summary** — shift-level counts (open, overdue, on-shift, completed, etc.).
- **Priority / status summary** — matrix or rollup of work orders by priority and status.
- **Needs-attention list** — escalations, blockers, and exceptions requiring supervisor action.
- **Active / scheduled work list** — today's in-progress and upcoming work orders for the org.
- **Optional approval / auditor context** — lightweight awareness payload per
  [ADR-001](../decisions/ADR-001-auditor-system.md) (observability only; not authorization).

## Candidate fields

Generic field names only — not a final schema or API contract.

### Org context

- `org_id`
- `org_name`
- `membership_role`
- `membership_status` (e.g. active — resolved from live `memberships`, not JWT alone)

### KPI summary

- `open_count`
- `overdue_count`
- `due_today_count`
- `in_progress_count`
- `crews_on_shift_count`
- `waiting_approval_count`
- `completed_today_count`
- `as_of` (server timestamp for cache / staleness hints)

### Priority / status summary

- `priority` (e.g. critical, high, normal, low)
- `status` (e.g. open, in_progress, waiting, scheduled)
- `count` per priority × status cell
- `org_id` (implicit on parent response; repeated only if sections are split later)

### Needs-attention list

- `id` (stable item id for UI keying)
- `kind` (e.g. overdue, blocked, unassigned, awaiting_approval)
- `title` / `label`
- `detail` / `summary`
- `work_order_id` (when item maps to a work order)
- `priority`
- `due_at`
- `site_name`
- `needs_attention` (item-level flag; may mirror `kind`)

### Active / scheduled work list

- `id` / `work_order_id`
- `title`
- `status`
- `priority`
- `due_at`
- `scheduled_start` / `scheduled_end`
- `assigned_to` (crew or person display name)
- `site_name`
- `asset_name`
- `crew_name`

### Optional approval / auditor context

- `pending_approval_count`
- `recent_governance_event_count` (session or org window — TBD)
- `auditor_note` (static or templated awareness string; ADR-001 observability only)

## Derived backend flags

Likely booleans computed server-side when building list rows (not trusted from client input):

- `overdue` — `due_at` before now and not terminal status.
- `due_today` — due date falls on the org's operational "today" window.
- `unassigned` — no crew or assignee on an otherwise active work order.
- `blocked` — waiting on parts, access, dependency, or external gate.
- `awaiting_approval` — held for operator/Chief approval before progression.
- `stale` — no status update within a configured threshold (org policy TBD).

## ADR-002 constraints

- **Work orders remain backend-mediated** — the Today read model is served by a trusted API
  (service role or equivalent); clients do not assume direct `work_orders` table or RLS access.
- **Response must be scoped by live membership context** — every query filters by org (and role)
  derived from `memberships` at request time; JWT hints may inform UX but never sole enforcement.
- **No direct client assumption of raw table access** — field names and counts are API-owned;
  promoting tables under RLS later must not require the UI to know Postgres shape.
- **KPI counts must reconcile with visible rows for the same org** — summary numbers and list
  sections use the same membership scope and snapshot semantics for a single request.
- **Destructive or cross-org operations stay out of this read model** — Today is read-only;
  writes and role changes continue through separate, membership-checked commands.
- **Future RLS promotion should not require redesigning the page contract** — if `work_orders`
  moves inside the RLS boundary per ADR-002 promotion criteria, the HTTP response shape and UI
  sections remain stable; only the server's data access path changes.

## Status

Planning-only contract. No endpoint, policy, or runtime auth behavior is implemented by this document.
