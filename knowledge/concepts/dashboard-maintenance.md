---
title: Dashboard Maintenance (small, low-risk repo upkeep)
type: concept
status: established
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

## Established facts

- The July 2026 dashboard audit (see `projects/dashboard-audit-july-2026.md`) produced
  three real examples: PR #75 (KnowledgePage missing the established
  `TableScroll`/`PanelEmpty` pattern), PR #76 (a duplicate date-formatting util plus a
  confirmed-zero-callers dead export), PR #77 (a `useCallback`/`useMemo` dependency bug
  in `DataContext` that silently defeated its own memoization).
- All three were low-risk enough to bundle into one `ApprovalCard`
  (`apr-build-dashboard-maintenance-bundle`, PR #79) rather than reviewed as three
  separate decisions — see `decisions/dashboard-maintenance-bundle.md`.
- David approved the entire bundle; all three merged to `main` 2026-07-04
  (`bcdd981`, `e4a1746`, `f0fd0ea`).
- Each fix was verified via `npm run qa` (lint + strict `tsc -b` + build) and a browser
  QA pass before being proposed — not just asserted.

## Open questions / inference

- The audit that produced these three fixes also flagged bigger, explicitly
  out-of-scope items (a mobile Chief-panel/sidebar overlap, `chiefLiveContext.ts` /
  `ChiefPanel.tsx` file size, a spacing-token scale) — these are separate, larger
  decisions, not yet scheduled, and deliberately excluded from this concept's scope.
- No standing cadence for "run a dashboard maintenance pass" exists yet beyond the
  Daily Build Health Check workflow — whether this becomes its own recurring workflow
  or stays an occasional audit-driven activity is undecided.

## Related

- Pages: [dashboard-audit-july-2026](../projects/dashboard-audit-july-2026.md), [approval-load](approval-load.md)
- PRs: #75, #76, #77, #79
- Decisions: [dashboard-maintenance-bundle](../decisions/dashboard-maintenance-bundle.md)
