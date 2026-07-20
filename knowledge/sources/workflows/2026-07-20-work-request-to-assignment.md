---
id: workflow-2026-07-20-work-request-to-assignment
title: Work request to assignment
type: workflow_observation
status: draft
truth_level: reported
scope: ops-workflow
sensitivity: internal
regs: []
data_type: desk_research
created_by: research
created_at: 2026-07-20
updated_at: 2026-07-20
links: [https://upkeep.com/features/, https://www.rockwellautomation.com/en-us/products/software/factorytalk/maintenancesuite/fiix.html]
tags: [request, assignment, handoff]
workflow: work-order-handoff
evidence_strength: low
---

# Work request to assignment

> File under `knowledge/sources/`. Schema: `knowledge/reference/knowledge-schema.md`.

## Context

Public CMMS feature pages describing request portals and WO assignment. Low evidence strength — marketing-level, not observed handoffs.

## Workflow observed

1. Requester (operator, guest portal, or internal user) submits a work request.
2. Request is routed / reviewed (MaintainX lists request portals, custom routing, free requester seats on pricing page; Fiix markets fast request→response).
3. Approved/accepted request becomes a work order and is assigned to a tech or team.
4. Tech executes; requester may get status visibility depending on product/tier.

## Friction / failure points

- Public pages under-specify **supervisor approval bottlenecks** (who prioritizes when requests flood in).
- Free requester seats increase inbound volume — assignment load becomes the real constraint (hypothesis).

## Implications for TrueCrew

Command-center value may be **triage and handoff clarity** (what’s waiting on whom), not the request form itself.

## Open questions / next actions

- Confirm approval-step patterns in Limble Enterprise / MaintainX approvals features with deeper doc reads.
- Interview: who owns prioritization — supervisor, planner, or lead tech?
