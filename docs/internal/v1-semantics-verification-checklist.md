# V1 semantics verification checklist

Use this before merging any refactor that touches `lib/ops/v1MergePlan.ts`,
`lib/ops/v1IntegrationCheck.ts`, or their call sites. It's a check on naming/behavior alignment,
not a change proposal — if any item fails, the fix is to restore alignment, not to reinterpret the
semantics documented in `docs/internal/v1-merge-runbook.md`.

- **`isBaselinePresentOnDisk` still answers "is it on disk here," nothing more.** It must not gain
  any dependency on merge state, git history, or `mergedSliceIds`. If it starts needing that input,
  it has stopped being a disk-presence check.
- **`isBaselineAchieved` stays a pure, identical alias.** Same signature, same return value, same
  behavior as `isBaselinePresentOnDisk` — it should never diverge from it or pick up logic of its
  own. It exists only for callers that haven't migrated off the deprecated name yet.
- **`isBaselineMerged` still requires `mergedSliceIds` as evidence, never infers it.** It must not
  fall back to disk presence, branch name, or any other implicit signal when `mergedSliceIds` is
  empty or missing — an empty list should mean "no merge evidence," not "assume merged" or "assume
  unmerged from disk state."
- **`merge-plan-main-merge` can only return `pass` when `isBaselineMerged` is true.** Presence alone
  (`isBaselinePresentOnDisk` true, `mergedSliceIds` empty or partial) must keep producing `partial`,
  never `pass` — a rename or refactor must not quietly relax this into "presence is good enough."
- **The `partial` messages still distinguish *why*.** "Present on disk but not merged," "partially
  merged, missing X," and "missing on disk entirely" are three different situations with three
  different messages today — a refactor should not collapse them into one generic partial message,
  since the runbook and downstream tooling rely on the distinction.
- **No renamed function silently changes which argument means what.** `root`/`presentSliceIds`
  (disk-scoped) and `mergedSliceIds` (merge-scoped) must stay on the functions that match their
  scope — check that a rename didn't move a disk-scoped check onto merge-scoped inputs or vice
  versa.
- **The retired `merge-plan-baseline` id stays retired.** Nothing should reintroduce it as an alias
  or resurrect its old semantics under a new id; `merge-plan-main-merge` is the only current id for
  this check.
- **Tests still assert tip-vs-main divergence, not just individual function output.** The parity
  test for `isBaselineAchieved`/`isBaselinePresentOnDisk` and the integration-check tests for
  `merge-plan-main-merge` should keep covering the "present but unmerged" case explicitly — not
  just the fully-merged and fully-missing extremes — since that middle case is the one this
  semantics split exists to get right.
