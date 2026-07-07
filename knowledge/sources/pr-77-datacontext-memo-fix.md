---
title: PR #77 — DataContext memoization fix
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [dashboard-maintenance, dashboard-audit-july-2026]
related_prs: [77]
related_cards: [apr-build-dashboard-maintenance-bundle]
---

# PR #77 — DataContext memoization fix

## Origin

[PR #77](https://github.com/TrueCrew1/truecrew-dashboard/pull/77), from the Dashboard
Audit (2026-07-04).

## Raw summary

`DataContext.tsx`'s `refresh` was a plain async function recreated on every render,
which defeated the intended memoization of the context `value` object (since `refresh`
was implicitly part of what consumers depend on). Wrapped `refresh` in
`useCallback(..., [])`; updated the mount `useEffect`'s dependency array and the
`value` `useMemo`'s dependency array to correctly include `refresh`. 1 file, +4/-4.
Perf-only, no behavior change.

## Extracted facts

- Caught (and fixed) an ESLint `react-hooks/exhaustive-deps` warning during this same
  PR: `refresh` was added to the `useEffect` array but initially missed on the `value`
  `useMemo` array — `npm run qa` surfaced it, fixed, re-ran clean.
- Merged to `main` 2026-07-04T18:17:44Z as squash commit `f0fd0ea`. Branch deleted.
- Bundled with #75/#76 — see
  [decisions/dashboard-maintenance-bundle.md](../decisions/dashboard-maintenance-bundle.md).

## Processed into

- [projects/dashboard-audit-july-2026.md](../projects/dashboard-audit-july-2026.md)
- [decisions/dashboard-maintenance-bundle.md](../decisions/dashboard-maintenance-bundle.md)
- [concepts/dashboard-maintenance.md](../concepts/dashboard-maintenance.md)
