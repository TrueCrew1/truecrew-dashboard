---
title: Rebase the orphaned commit onto main and reopen as a new PR
type: lesson
status: active
confidence: high
source_workflow: ad hoc PR sequencing (Chief Approval Panel work, PR #64/#65/#66)
source_agent: Build
category: recovery-pattern
related_pages: [chief-approvals]
related_prs: [65, 66]
last_reviewed: 2026-07-04
---

## Rule

When a PR is auto-closed because its stacked base branch was deleted (see
`lessons/github-stacked-branch-autoclose.md`), rebase the same commit directly onto
current `main`, push it as a fresh branch, and open a new PR. Comment on the old,
closed PR marking it superseded by the new one.

## Why

This recovery is small, mechanical, and fully preserves the original work — no
content is rewritten or re-reviewed from scratch, just re-based and re-opened. It was
used to turn closed PR #65 into merged PR #66 with zero content loss.

## Apply when

A PR is auto-closed because its stacked base branch was deleted, and the commit
itself is still intact (check `git log <old-ref>` before assuming it's gone).

## Avoid when

The underlying commit has actually been lost (the branch ref itself was deleted, not
just the PR closed) — this recovery only works because the branch ref survived; if it
didn't, this is a bigger problem than a rebase fixes.

## Check first

Confirm the old branch/commit still exists (`git branch -a`, `git log <old-ref>`)
before starting the rebase, and comment on the closed PR linking to its replacement so
the history stays traceable.

---

Stable.
