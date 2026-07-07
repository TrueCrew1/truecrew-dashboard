---
title: Bundle same-decision findings into one ApprovalCard
type: lesson
status: active
confidence: high
source_workflow: Dashboard Maintenance Pass / Daily Build Health Check
source_agent: Chief
category: orchestration-pattern
related_pages: [approval-load, dashboard-maintenance]
related_prs: [75, 76, 77, 79]
last_reviewed: 2026-07-04
---

## Rule

When multiple findings from the same workflow run share the same recommended
decision and have no interaction between them, present them as one `ApprovalCard`
with one checklist item per finding — not one card each.

## Why

Approval Load's core goal is a shorter decision queue without weakening any gate.
This has been validated at two different batch sizes: the PRs #75/#76/#77
dashboard-maintenance bundle (3 items) and a separate 13-PR stale-cleanup bundle. Both
were reviewed and decided by David in one pass, with no back-and-forth needed to
reconcile near-duplicate decisions.

## Apply when

Findings share the same recommended decision and come from the same workflow run,
with no cross-cutting interaction between them.

## Avoid when

Any finding in the batch has a genuinely different recommendation (e.g. one
"approve," one "needs changes") — bundling then hides a real disagreement; split
instead.

## Check first

Re-verify every item's real state immediately before presenting the bundle (see
`lessons/reverify-state-before-acting.md`) — state can drift between discovery and
presentation.

---

Validated twice in real use before this lesson was written down.
