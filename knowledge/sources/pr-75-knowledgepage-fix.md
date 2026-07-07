---
title: PR #75 — KnowledgePage table/empty-state fix
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [dashboard-maintenance, dashboard-audit-july-2026]
related_prs: [75]
related_cards: [apr-build-dashboard-maintenance-bundle]
---

# PR #75 — KnowledgePage table/empty-state fix

## Origin

[PR #75](https://github.com/TrueCrew1/truecrew-dashboard/pull/75), from the Dashboard
Audit (2026-07-04). Referenced in `BUILD_REQUEST_DASHBOARD_MAINTENANCE_BUNDLE`
(`agentApprovalGates.ts`) and the Build Log's "Dashboard maintenance bundle" entries.

## Raw summary

`src/pages/KnowledgePage.tsx` was missing the `TableScroll`/`PanelEmpty` wrapper
pattern already established on sibling pages (Builds, Operations). Added both wrappers
and `scope="col"` table headers to both tables on the page (Prompt library, Knowledge
entries); empty states made vault-status-aware (distinguishes unreachable /
unconfigured / empty). UX-only, no behavior change. 1 file, +75/-45.

## Extracted facts

- Verified `npm run qa` clean and browser-checked before merge (per the audit hand-off).
- Merged to `main` 2026-07-04T18:17:39Z as squash commit `bcdd981`. Branch deleted.
- Bundled with #76/#77 into one `ApprovalCard` (`apr-build-dashboard-maintenance-bundle`,
  PR #79) rather than reviewed standalone — see
  [decisions/dashboard-maintenance-bundle.md](../decisions/dashboard-maintenance-bundle.md).

## Processed into

- [projects/dashboard-audit-july-2026.md](../projects/dashboard-audit-july-2026.md)
- [decisions/dashboard-maintenance-bundle.md](../decisions/dashboard-maintenance-bundle.md)
- [concepts/dashboard-maintenance.md](../concepts/dashboard-maintenance.md)
