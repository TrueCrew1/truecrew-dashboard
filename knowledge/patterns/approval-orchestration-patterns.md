---
title: Approval / Orchestration Patterns
type: pattern
status: active
created: 2026-07-04
updated: 2026-07-04
related_pages: [approval-load, dashboard-maintenance]
related_prs: [75, 76, 77, 79]
related_cards: [apr-build-dashboard-maintenance-bundle]
---

# Approval / Orchestration Patterns

Chief's card structures, bundling moves, and digest patterns that worked (or didn't).
One dated entry per learning, merged into this single page.

#### 2026-07-04 — Bundle same-decision findings into one ApprovalCard

- **Pattern type:** Approval-Orchestration
- **Agent:** Chief
- **Workflow:** Dashboard Maintenance Pass / Daily Build Health Check
- **Context:** Multiple independent findings from the same pass (three small dashboard
  fixes; separately, 13 confirmed-superseded stale PRs) all shared the same
  recommendation and no cross-cutting interaction between them.
- **What happened:** Bundled same-decision findings into a single card with one
  checklist item per finding, instead of one card per finding — the PRs #75/#76/#77
  dashboard-maintenance bundle, and a separate 13-PR stale-cleanup bundle. Both were
  reviewed and decided by the operator in one pass, with no back-and-forth needed to
  reconcile near-duplicate decisions.
- **Outcome:** success
- **Why this matters:** Approval Load's core goal is a shorter decision queue without
  weakening any gate. This has now been validated at two different batch sizes
  (3 items, 13 items) — it scales and holds up under real review, not just in theory.
- **Next-time guidance:**
  - Repeat when: findings share the same recommended decision and come from the same
    workflow run, with no interaction between them.
  - Avoid when: any finding in the batch has a genuinely different recommendation
    (e.g. one "approve," one "needs changes") — bundling then hides a real
    disagreement; split instead.
  - Check first: re-verify every item's real state immediately before presenting the
    bundle (see `patterns/winning-patterns.md`'s re-verification entry) — state can
    drift between discovery and presentation.
- **Confidence:** high
- **Review horizon:** stable
- **Status:** active
- **Memory worth:** success_uses: 0, failure_uses: 0 (validated twice before this
  tracking system existed — counters start fresh per policy)
