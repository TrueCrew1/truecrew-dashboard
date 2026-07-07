---
title: PR #76 — duplicate util + dead export cleanup
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [dashboard-maintenance, dashboard-audit-july-2026]
related_prs: [76]
related_cards: [apr-build-dashboard-maintenance-bundle]
---

# PR #76 — duplicate util + dead export cleanup

## Origin

[PR #76](https://github.com/TrueCrew1/truecrew-dashboard/pull/76), from the Dashboard
Audit (2026-07-04).

## Raw summary

`MonitorPage.tsx` had a local `formatTimeAgo()` duplicating the shared
`formatRelativeTime` from `src/components/ui/index.tsx`; removed the duplicate and
switched `MonitorPage` to import the shared version (which gained a null-guard,
`if (!isoDate) return "—"`, for backward compatibility). Also removed
`toggleApprovalStatusFilter()` from `src/components/chief/approvalStatus.ts` —
confirmed via `grep -rn` to have zero callers before deletion. 3 files, +3/-18. No
behavior change.

## Extracted facts

- Merged to `main` 2026-07-04T18:17:41Z as squash commit `e4a1746`. Branch deleted.
- Bundled with #75/#77 — see
  [decisions/dashboard-maintenance-bundle.md](../decisions/dashboard-maintenance-bundle.md).

## Processed into

- [projects/dashboard-audit-july-2026.md](../projects/dashboard-audit-july-2026.md)
- [decisions/dashboard-maintenance-bundle.md](../decisions/dashboard-maintenance-bundle.md)
- [concepts/dashboard-maintenance.md](../concepts/dashboard-maintenance.md)
