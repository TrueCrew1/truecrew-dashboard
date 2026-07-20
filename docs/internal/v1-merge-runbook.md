# V1 merge runbook

Ordered merge plan for the current V1 operational stack. Slice **presence** is detected from marker files on disk via `lib/ops/v1MergePlan.ts` — not from GitHub PR state.

**Tip branch ≠ live on main:** markers present on the feature tip means the stack is on disk; main merge status is separate and must be passed via `mergedSliceIds`.

## Merge order

Use `computeMergeOrder()` as the single source of truth. Slices merge in this sequence:

| Order | Slice | PR | Branch | Depends on |
|------:|-------|-----|--------|------------|
| 1 | Tool governance catalog + integrations inventory | #162 | `cursor/tool-governance-catalog-0eaa` | — |
| 2 | Chief operational readiness summary | #163 | `cursor/chief-operational-readiness-0eaa` | #162 |
| 3 | Command Center operational status panel | #164 | `cursor/chief-command-center-ops-status-0eaa` | #163 |
| 4 | Chief governed evidence trail panel | #165 | `cursor/chief-evidence-trail-0eaa` | #164 |
| 5 | Chief daily turnover backend + panel | #166 | `cursor/chief-daily-turnover-panel-0eaa` | #165 |
| 6 | Builder V1 structured report (optional) | — | `cursor/builder-v1-report-0eaa` | — |

After each merge, rebase the next branch onto updated `main` so stacked duplicate commits drop out of the diff.

## Baseline checks

**Disk presence** (markers on branch):

```bash
npx tsx -e "import { isBaselinePresentOnDisk, detectPresentSliceIds, listMissingBaselineSliceIds } from './lib/ops/v1MergePlan.ts'; console.log({ present: detectPresentSliceIds(), onDisk: isBaselinePresentOnDisk(), missing: listMissingBaselineSliceIds() });"
```

**Merged to main** (pass `mergedSliceIds` from CI or a fixture):

```bash
npx tsx -e "import { isBaselineMerged, REQUIRED_BASELINE_SLICE_IDS } from './lib/ops/v1MergePlan.ts'; console.log({ merged: isBaselineMerged(REQUIRED_BASELINE_SLICE_IDS) });"
```

- `isBaselinePresentOnDisk()` — all required marker files exist on disk (true on the feature stack tip). Deprecated alias: `isBaselineAchieved()`.
- `isBaselineMerged(mergedSliceIds)` — all required slices recorded as merged to `main`.
- Builder report (slice 6) is optional for baseline.

## Integration harness

```bash
npx vitest run tests/v1-merge-plan.test.ts
npx vitest run tests/v1-operational-flows.test.ts
```

`lib/ops/v1IntegrationCheck.ts` aggregates catalog, readiness, panel, evidence, turnover, and merge-plan checks. The `merge-plan-main-merge` check returns **partial** on open-PR stack branches (markers present, not merged) and **pass** only when `mergedSliceIds` covers all required slices. Not wired to production routes in V1.
