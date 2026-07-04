---
title: Winning Patterns
type: pattern
status: active
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals, dashboard-maintenance]
related_prs: [75, 76, 77]
related_cards: []
---

# Winning Patterns

Reliable success patterns worth repeating, general enough to apply across agents and
workflows. One dated entry per learning, merged into this single page rather than
split across files — see `docs/AGENT_RUNBOOK.md` § High-Value Learning Capture. (For
patterns specific to Chief's card/bundling structures, see
`patterns/approval-orchestration-patterns.md` instead.)

#### 2026-07-04 — Re-verify real state immediately before acting, not just at discovery time

- **Pattern type:** Winning
- **Agent:** Chief / Build (applies to any agent making a claim about external state)
- **Workflow:** Dashboard Maintenance Pass, Daily Build Health Check, and ad hoc card
  creation generally
- **Context:** Facts about PRs (open/mergeable/CI status) were established once during
  discovery (e.g. when a card was first drafted), but real state can drift by the
  time an action (merge, present-for-decision) actually happens.
- **What happened:** Before merging PRs #75/#76/#77, and before presenting several
  cards, state was re-checked via `gh pr view` immediately beforehand rather than
  trusting the earlier discovery-time check. This caught nothing wrong in these
  specific cases, but the practice itself — treating "verified at discovery" and
  "verified right now" as different facts — has been applied consistently and
  deliberately across this session's real card/merge actions.
- **Outcome:** success
- **Why this matters:** the gap between discovery and action is exactly where stale
  assumptions cause real mistakes (merging something no longer mergeable, presenting
  a card whose facts changed) — a cheap, mechanical re-check closes that gap for the
  cost of one extra command.
- **Next-time guidance:**
  - Repeat when: any action (merge, close, present-for-decision) happens more than a
    few minutes after the fact was first established, or after any other action was
    taken in between.
  - Avoid when: n/a — this is close to unconditionally worth doing when the re-check
    is cheap (a single `gh` read), which it almost always is here.
  - Check first: re-run the same read used at discovery time (`gh pr view`,
    `gh pr diff --name-only`, etc.) immediately before the action, not a summary of
    what it said earlier.
- **Confidence:** high
- **Review horizon:** stable
- **Status:** active
- **Memory worth:** success_uses: 0, failure_uses: 0 (validated repeatedly before this
  tracking system existed — counters start fresh per policy; historical evidence
  informs the Confidence rating above, not the counters)
