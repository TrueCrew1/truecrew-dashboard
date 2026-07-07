---
title: Approval Load
type: concept
status: active
confidence: high
last_reviewed: 2026-07-04
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

## What works

- Hard per-workflow card caps: Planner 1–3, Build 0–3, Research ≤1, Content ≤1 per
  run. Hitting the cap signals "bundle or defer," not "ask for an exception."
- **Bundling rule:** multiple findings from the same workflow run, on the same
  underlying thing, sharing the same recommended decision, become one card with one
  checklist item per finding — see `lessons/bundle-same-decision-cards.md`. If one
  finding is "approve" and another is genuinely "needs changes," they're split, not
  bundled.
- **External-facing copy is never eligible for bundling, full stop** — "External copy
  — no surprises" overrides the general bundling rule regardless of impact level.
- **Priority order when overflow happens:** rank by impact (high/medium/low) → surface
  high-impact items immediately and individually → bundle same-decision medium/low
  *internal* items → if bundled items would still pile up faster than David can
  review, defer to the next Chief Weekly Digest (a logging decision, never a silent
  drop).
- Validated at least twice in real use: the 15-stale-PR-cleanup bundle, and the PR
  #75/#76/#77 dashboard-maintenance bundle (`decisions/dashboard-maintenance-bundle.md`).

## What to check first

- `lessons/bundle-same-decision-cards.md` before creating any multi-finding card.
- `lessons/reverify-state-before-acting.md` immediately before presenting a bundle.
- Whether the PR #57/#58 auth card and a related Vercel-secret card overlap in scope
  before bundling — they were kept deliberately separate since they're different
  decisions on different scopes.

## Open questions

- Not yet tested in practice: a case where a *high*-impact bundle candidate and a
  *low*-impact one arrive in the same workflow run needing different treatment
  simultaneously. The runbook's ordering implies this resolves cleanly, but it hasn't
  been exercised for real.
- `docs/AGENT_RUNBOOK.md` (and therefore this page's source rule) is still on an
  unmerged PR — see `decisions/agent-runbook-adoption.md`.

## Related

- Decisions: [dashboard-maintenance-bundle](../decisions/dashboard-maintenance-bundle.md), [agent-runbook-adoption](../decisions/agent-runbook-adoption.md)
- Sources: [approval-load-runbook-section](../sources/approval-load-runbook-section.md)
- Lessons: [bundle-same-decision-cards](../lessons/bundle-same-decision-cards.md)
