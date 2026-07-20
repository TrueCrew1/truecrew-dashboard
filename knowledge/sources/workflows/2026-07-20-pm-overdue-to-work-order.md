---
id: workflow-2026-07-20-pm-overdue-to-work-order
title: PM overdue to work order
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
links: [https://upkeep.com/product/preventive-maintenance/, https://www.getmaintainx.com/pricing]
tags: [pm, work-order, supervisor]
workflow: pm-overdue
evidence_strength: medium
---

# PM overdue to work order

> File under `knowledge/sources/`. Schema: `knowledge/reference/knowledge-schema.md`.

## Context

Desk research from public CMMS PM product pages (not a field ride-along). Describes the **documented vendor workflow**, not a verified site practice.

## Workflow observed

1. Define PM trigger (calendar interval, meter threshold, and/or sensor/condition).
2. System auto-generates a work order when the trigger fires, often with checklist/procedure and parts attached.
3. WO is assigned / prioritized; overdue or incomplete PMs surface as compliance/backlog pressure in dashboards (vendor marketing: “PM compliance”).
4. Technician completes WO on mobile; status closes the loop back to the schedule.

Sources: UpKeep PM page; MaintainX pricing/features (repeating work orders, meter-based maintenance on higher tiers).

## Friction / failure points

- Vendors emphasize **generation and mobile completion**; less public detail on **supervisor triage** when many PMs go overdue the same morning.
- Offline / connectivity gaps can delay closeout (see mobile-closeout note).

## Implications for TrueCrew

Today should surface **overdue / due-soon PM exceptions** as a first-class signal even if CMMS remains system of record for WO execution.

## Open questions / next actions

- Interview supervisors: is overdue PM actually the first glance, or is it breakdowns/safety holds?
- Map which CMMS APIs expose overdue PM counts.
