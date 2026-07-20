---
id: assumption-2026-07-20-overdue-pm-is-top-today-signal
title: Overdue PM is top Today signal
type: assumption
status: draft
truth_level: hypothesis
scope: discovery
sensitivity: internal
regs: []
data_type: synthetic
created_by: research
created_at: 2026-07-20
updated_at: 2026-07-20
links:
  - sources/findings/2026-07-20-supervisor-day-starts-with-exceptions.md
  - sources/workflows/2026-07-20-pm-overdue-to-work-order.md
tags: [pm, today-view, assumption]
workflow: pm-overdue
evidence_strength: low
---

# Overdue PM is top Today signal

> File under `knowledge/sources/`. Assumptions are **not** policy.

## Assumption

For TrueCrew’s supervisor ICP, **overdue preventive maintenance** is the highest-value default signal on the Today view (ahead of generic task lists or analytics).

## Why we believe it (for now)

CMMS vendors center PM schedules, auto-WO generation, and “PM compliance” in public product stories; supervisor-exception hypothesis points the same direction. **No interviews yet.**

## How we would falsify it

Supervisor interviews or ride-alongs show first glance is safety holds, production downtime, staffing, or parts shortages—not overdue PM.

## Implications if true / if false

- **If true:** ship Today with overdue-PM/exception stack first.
- **If false:** re-rank Today signals; keep PM as secondary card.

## Open questions / next actions

- Run interview pass; do not promote this to decision until falsified or confirmed.
