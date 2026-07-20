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

## V1 inspection branch policy

Inspection/tip branches (e.g. `cursor/v1-feature-and-integration-tip-0eaa`) exist to give a single
checkout with the full V1 stack's marker files on disk, for running tests and the integration
harness against the whole surface at once. They are **not** a source of truth for what's shipped —
`main` is.

- **Tip must be refreshed after major V1 merges.** Once a slice PR merges to `main`, the tip branch
  is stale by definition — it no longer fast-forwards from `main` and may be missing merge commits
  entirely. Recreate or rebase the tip from current `main` rather than letting it drift; do not
  treat an old tip as still representative once new slices have landed.
- **Tip is for inspection and harness runs only.** Passing tests, lint, build, or
  `runV1IntegrationChecks()` on the tip demonstrates the stack is internally consistent on that
  branch. It does not demonstrate the stack is merged. Only `mergedSliceIds` populated from real
  main-merge knowledge (see `isBaselineMerged` above) can demonstrate that, and that data only
  reflects reality when the caller supplies it accurately.
- **Production truth lives on `main`.** Any claim that "V1 is complete" or "V1 is live" must be
  backed by checks run against `main` (or by `mergedSliceIds` that accurately reflects `main`), not
  by a green run on an inspection branch.

### Refreshing tip from main (high level)

1. Confirm the merges you expect are actually on `main` (e.g. `git log --oneline main` for the
   relevant PR merge commits).
2. Recreate the tip branch from current `main` (fast-forward or rebase the tip onto `main`,
   depending on whether the tip still needs to carry unmerged, in-flight commits) rather than
   patching the old tip in place.
3. Re-run the harness on the refreshed tip: `npx vitest run tests/v1-merge-plan.test.ts
   tests/v1-operational-flows.test.ts`, and re-check `runV1IntegrationChecks()` output.
4. Confirm `merge-plan-main-merge` and `builder-report-presence` now reflect the same state as a
   run against `main` itself (both `pass` when `mergedSliceIds` covers all required slices, or both
   showing the same partial/missing detail when it doesn't). A refreshed tip should never show a
   more "complete" picture than `main` does — if it does, the tip still has drift to resolve.
