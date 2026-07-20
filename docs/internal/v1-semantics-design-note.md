# Design note: `merge-plan-main-merge` on tip vs. main

## Observed behavior

- On `main` (`deb965e…`), `runV1IntegrationChecks({ mergedSliceIds: <all required slices> })`
  returns `merge-plan-main-merge: pass`.
- On the stale inspection tip `cursor/v1-feature-and-integration-tip-0eaa` (`b924012…`), the same
  function called with default args (no `mergedSliceIds` supplied) returns
  `merge-plan-main-merge: partial`, with a message indicating V1 stack markers are present on the
  branch but the slices are not merged to main.

Both outcomes are correct and expected. This note explains why.

## Why the outcomes differ

`merge-plan-main-merge` is derived from two independent signals in `lib/ops/v1MergePlan.ts`:

- `isBaselinePresentOnDisk(root, { presentSliceIds })` — true when every required slice's marker
  files exist at the given root. This is a filesystem check against whatever commit is checked
  out. It says nothing about `main`.
- `isBaselineMerged(mergedSliceIds)` — true only when every required slice id appears in
  `mergedSliceIds`, a list the caller supplies from actual main-merge knowledge (CI, git metadata,
  or an explicit fixture). It has no way to infer this from disk.

`runV1IntegrationChecks` combines them with a strict priority order: `stackMerged` (pass) beats
partial main-merge progress, which beats "present but unmerged," which beats "missing on disk."
Nothing about being *on a branch* can produce a `pass` — only `mergedSliceIds` covering every
required slice can.

**On the stale tip:** the harness is invoked with default args, so `mergedSliceIds` defaults to
`[]`. Because the tip's marker files satisfy `isBaselinePresentOnDisk`, the check falls into the
"present, not merged" branch and reports `partial`. This is true regardless of how complete the
stack looks on that branch — the check was never given evidence that these slices reached `main`,
so it cannot claim they did.

**On main:** the harness is invoked with `mergedSliceIds` populated from the real, current set of
slices merged into `main` (all of them, per PR #162–#170/#169). `isBaselineMerged` is satisfied, so
the check reports `pass`. The `pass` here is earned by an explicit assertion about merge state, not
inferred from disk contents.

`builder-report-presence` follows the same shape at a smaller scale: it reports whether the
Builder V1 report capability is available and treated as integrated, not merely whether a file with
that name exists somewhere in the working tree. Presence and merged-integration are tracked as
separate facts throughout the harness, the same way they're separated in `v1MergePlan.ts`.

## Why this matches intended semantics

The design intentionally keeps two questions separate:

1. **Is the V1 stack present on disk at this tip?** (`isBaselinePresentOnDisk`) — a statement about
   a specific checkout, useful for verifying a branch or stack is internally complete.
2. **Is the V1 stack merged to main?** (`isBaselineMerged`) — a statement about production truth,
   useful for deciding whether V1 is actually shipped.

A stack-style inspection branch — carrying commits that were never fast-forwarded or merged into
`main` — can satisfy (1) while failing (2). If `merge-plan-main-merge` (or any other check) treated
disk presence as sufficient for `pass`, running the harness on any sufficiently complete feature
branch would produce a false "V1 complete" signal, even though nothing on that branch has actually
landed where production reads from. That is exactly the failure mode `isBaselineMerged` and the
`mergedSliceIds`-driven branches of `merge-plan-main-merge` exist to prevent.

The `partial` outcome on the stale tip is therefore not a bug or a stale fixture artifact — it is
the harness correctly refusing to certify "merged" for a branch it has no merge evidence for. The
`pass` outcome on `main` is the harness correctly certifying "merged" once given the actual
merge record. Tip and main are expected to diverge on this check whenever the tip is not itself
an up-to-date reflection of `main` — which is precisely the condition described in the "V1
inspection branch policy" section of `docs/internal/v1-merge-runbook.md`.
