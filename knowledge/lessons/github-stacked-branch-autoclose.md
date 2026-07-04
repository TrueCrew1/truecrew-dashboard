---
title: GitHub auto-closes a PR when its stacked base branch is deleted on merge
type: lesson
status: active
confidence: high
source_workflow: ad hoc PR sequencing (Chief Approval Panel work, PR #64/#65/#66)
source_agent: Build
category: constraint
related_pages: [chief-approvals]
related_prs: [64, 65, 66]
last_reviewed: 2026-07-04
---

## Rule

A PR opened on a branch stacked on top of another unmerged branch will be
auto-closed by GitHub (not retargeted) if that base branch is deleted when the base
PR merges. This is a platform behavior, not a bug in the process.

## Why

PR #65 was opened stacked on PR #64's branch. When #64 merged and its branch was
deleted (standard squash-merge-and-delete-branch flow), GitHub closed #65 instead of
retargeting it to `main`. The underlying commit wasn't lost — only the PR wrapper
was — but it had to be recreated (see the matching recovery lesson).

## Apply when

n/a — this is a constraint to plan around, not a move to repeat.

## Avoid when

About to open a new branch while a related branch is still unmerged — stacking is
sometimes reasonable for genuinely dependent work, but should be a deliberate choice.

## Check first

Prefer basing new branches on `main` directly. If a real dependency forces stacking,
expect the dependent PR to need a rebase-and-reopen once the base merges — budget for
it (see `lessons/rebase-and-reopen-recovery.md`) rather than being surprised by it.

---

Stable — this is GitHub platform behavior, unlikely to change.
