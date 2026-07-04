---
title: Dashboard Maintenance (small, low-risk repo upkeep)
type: concept
status: active
confidence: high
last_reviewed: 2026-07-04
created: 2026-07-04
updated: 2026-07-04
related_pages: [dashboard-audit-july-2026, approval-load]
related_prs: [75, 76, 77, 79]
related_cards: [apr-build-dashboard-maintenance-bundle]
---

# Dashboard Maintenance (small, low-risk repo upkeep)

## Summary

The category of small, independently-verified, no-behavior-change fixes that come out
of periodic dashboard audits — UI consistency gaps, dead code, and hook-dependency
correctness — as distinct from feature work, migrations, or anything production-risky.

## What works

- Small, focused PRs per finding (one fix per PR), each `npm run qa`-clean and
  browser-QA'd before being proposed — not just asserted. Proven at
  `projects/dashboard-audit-july-2026.md`'s three real fixes: PR #75 (missing
  `TableScroll`/`PanelEmpty` pattern), PR #76 (duplicate util + dead export), PR #77
  (`useCallback`/`useMemo` dependency bug).
- Bundling same-risk, same-recommendation fixes into one `ApprovalCard`
  (`apr-build-dashboard-maintenance-bundle`, PR #79) rather than reviewing them as
  separate decisions — see `decisions/dashboard-maintenance-bundle.md` and
  `lessons/bundle-same-decision-cards.md`.
- Formalized as the recurring **Dashboard Maintenance Pass** workflow
  (`docs/AGENT_RUNBOOK.md` § Agent Workflows), not a one-off.

## What to check first

- `projects/dashboard-audit-july-2026.md` for what's already fixed vs. still
  deliberately deferred, before auditing anything new.
- `lessons/reverify-state-before-acting.md` before merging/presenting a bundle — PR
  state can drift between discovery and action.
- The excluded/deferred items (mobile Chief-panel/sidebar overlap,
  `chiefLiveContext.ts`/`ChiefPanel.tsx` size, spacing tokens) — these are separate,
  larger decisions, not part of this category's normal scope.

## Open questions

- No standing cadence beyond "run it via the Dashboard Maintenance Pass workflow when
  asked, or after notable dashboard work" — whether it should also run automatically
  alongside the Daily Build Health Check is undecided.

## Related

- Decisions: [dashboard-maintenance-bundle](../decisions/dashboard-maintenance-bundle.md)
- Sources: [pr-75](../sources/pr-75-knowledgepage-fix.md), [pr-76](../sources/pr-76-dead-code-cleanup.md), [pr-77](../sources/pr-77-datacontext-memo-fix.md)
- Lessons: [bundle-same-decision-cards](../lessons/bundle-same-decision-cards.md), [reverify-state-before-acting](../lessons/reverify-state-before-acting.md)
