---
title: Approval Load
type: concept
status: established
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals, dashboard-maintenance]
related_prs: [71, 79, 73]
related_cards: [apr-build-dashboard-maintenance-bundle]
---

# Approval Load

## Summary

Approval Load is the set of rules Chief follows to keep David's approval queue short —
by bundling, prioritizing, and sometimes deferring findings — without ever weakening an
actual approval gate. The point of a workflow is to make the queue *shorter*, not
longer; a workflow that turns every finding into its own card has failed at this even
if each card is individually correct.

## Established facts

- Documented in `docs/AGENT_RUNBOOK.md` § **Approval Load** (see
  `sources/approval-load-runbook-section.md`).
- Hard per-workflow card caps exist: Planner 1–3, Build 0–3, Research ≤1, Content ≤1
  per run. Hitting the cap signals "bundle or defer," not "ask for an exception."
- **Bundling rule:** multiple findings from the same workflow run, on the same
  underlying thing, sharing the same recommended decision, become one card with one
  checklist item per finding. If one finding is "approve" and another is genuinely
  "needs changes," they're split, not bundled — a bundle should never hide a real
  disagreement.
- **External-facing copy is never eligible for bundling, full stop** — "External copy —
  no surprises" overrides the general bundling rule regardless of impact level.
- **Priority order when overflow happens:** rank by impact (high/medium/low) → surface
  high-impact items immediately and individually → bundle same-decision medium/low
  *internal* items → if bundled items would still pile up faster than David can review,
  defer to the next Chief Weekly Digest (a logging decision, never a silent drop).
- **Real applications this session** (not hypothetical): the 15-stale-PR-cleanup bundle
  (one card, one checklist line per PR); the PR #75/#76/#77 dashboard-maintenance
  bundle (one card, approved and merged — see
  `decisions/dashboard-maintenance-bundle.md`); the PR #57/#58 auth card kept
  deliberately separate from the PR #78 Vercel-secret card, since they're different
  decisions on different scopes.

## Open questions / inference

- The rule set hasn't yet been tested against a case where a *high*-impact bundle
  candidate and a *low*-impact one arrive in the same workflow run needing different
  treatment simultaneously — the runbook's ordering (rank → surface high → bundle
  low) implies this resolves cleanly, but it hasn't been exercised for real yet.
- `docs/AGENT_RUNBOOK.md` (and therefore this section) is still on an unmerged PR (see
  `decisions/agent-runbook-adoption.md`) — the rules are real and have been followed in
  practice, but they aren't yet the repo's committed, merged policy.

## Related

- Pages: [chief-approvals](chief-approvals.md), [dashboard-maintenance](dashboard-maintenance.md)
- PRs: #71, #79, #73
- Decisions: [dashboard-maintenance-bundle](../decisions/dashboard-maintenance-bundle.md), [agent-runbook-adoption](../decisions/agent-runbook-adoption.md)
