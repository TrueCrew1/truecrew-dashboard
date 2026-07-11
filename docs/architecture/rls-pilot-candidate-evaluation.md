# RLS Pilot Candidate Evaluation

## Purpose

- [ADR-002](../decisions/ADR-002-auth-trust-boundary.md) keeps all operational business tables
  backend-mediated for v1; only `organizations`, `profiles`, and `memberships` sit inside the
  direct-client RLS boundary at launch.
- This document exists only to evaluate future pilot candidates for phased RLS promotion — it
  does not approve any table for promotion and does not change runtime behavior.
- Selection and implementation must follow ADR-002 promotion criteria and the direction recorded
  in the [Supabase README](../../supabase/README.md) (including the future `authorize(...)`
  helper pattern).

## Candidate table types

| Candidate | Tenancy clarity | Mutation risk | Policy complexity | User value | Notes |
|---|---|---|---|---|---|
| work_orders | TBD — evaluate with real schema | Potentially high | Likely medium | Potentially high | TBD — evaluate with real schema |
| tasks | TBD — evaluate with real schema | Likely medium | Likely medium | Potentially high | TBD — evaluate with real schema |
| assets | TBD — evaluate with real schema | Likely medium | Likely medium | Potentially high | TBD — evaluate with real schema |
| crews | TBD — evaluate with real schema | Likely medium | Potentially high | Likely medium | TBD — evaluate with real schema |
| communications | TBD — evaluate with real schema | Potentially high | Potentially high | Likely medium | TBD — evaluate with real schema |
| documents | TBD — evaluate with real schema | Potentially high | Potentially high | Likely medium | TBD — evaluate with real schema |

## Selection criteria

A good first RLS pilot candidate should have:

- **Explicit organization ownership** — every row has a clear, enforceable `organization_id`
  (or equivalent) before any policy is written.
- **Low blast radius** — a mistaken policy exposes or mutates a bounded dataset, not the
  entire operational surface.
- **Strong user value** — promoting the table unlocks a meaningful direct-client read or
  collaboration workflow supervisors actually use in the field.
- **Simple membership-based access rules** — authorization maps cleanly to live
  `memberships` roles without exotic cross-table joins or workflow state machines.
- **Easy rollback to backend mediation** — the app can fall back to service-role API paths
  quickly if the pilot needs to be reversed.
- **Measurable performance** — realistic query load can be tested before and after promotion
  without blocking production operators.

## Current recommendation

No table is approved for promotion yet; selection must follow
[ADR-002](../decisions/ADR-002-auth-trust-boundary.md) and the RLS promotion checklist.
