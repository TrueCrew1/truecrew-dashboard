# V1 merge runbook

Ordered merge plan for the current V1 operational stack. Slice **presence** is detected from marker files on disk via `lib/ops/v1MergePlan.ts` — not from GitHub PR state.

## Merge order

| Order | Slice | PR | Branch |
|------:|-------|-----|--------|
| 1 | Tool governance catalog + integrations inventory | #162 | `cursor/tool-governance-catalog-0eaa` |
| 2 | Chief operational readiness summary | #163 | `cursor/chief-operational-readiness-0eaa` |
| 3 | Command Center operational status panel | #164 | `cursor/chief-command-center-ops-status-0eaa` |
| 4 | Chief governed evidence trail panel | #165 | `cursor/chief-evidence-trail-0eaa` |
| 5 | Chief daily turnover backend + panel | #166 | `cursor/chief-daily-turnover-panel-0eaa` |
| 6 | Builder V1 structured report (optional) | — | `cursor/builder-v1-report-0eaa` |

After each merge, rebase the next branch onto updated `main` so stacked duplicate commits drop out of the diff.

## Baseline check

```bash
npx tsx -e "import { isBaselineAchieved, detectPresentSliceIds, listMissingBaselineSliceIds } from './lib/ops/v1MergePlan.ts'; console.log({ present: detectPresentSliceIds(), baseline: isBaselineAchieved(), missing: listMissingBaselineSliceIds() });"
```

`isBaselineAchieved()` is true when slices 1–5 marker files are all present. Builder report (slice 6) is optional for baseline.

## Integration harness

Run the in-process stack checks:

```bash
npx vitest run tests/v1-operational-flows.test.ts
```

Helper: `lib/ops/v1IntegrationCheck.ts` — aggregates catalog, readiness, panel, evidence, turnover, and merge-plan checks for tests/ops scripts. Not wired to production routes in V1.
