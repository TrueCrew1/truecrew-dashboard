---
title: Constraints
type: pattern
status: active
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals]
related_prs: [64, 65, 66]
related_cards: []
---

# Constraints

Durable environment/tool/permission limits — things that are true regardless of how
careful the agent is, not mistakes to fix. One dated entry per learning, merged into
this single page.

#### 2026-07-04 — GitHub auto-closes a PR when its stacked base branch is deleted on merge

- **Pattern type:** Constraint
- **Agent:** Build
- **Workflow:** ad hoc PR sequencing (Chief Approval Panel work, PR #64/#65/#66)
- **Context:** PR #65 was opened on a branch stacked on top of PR #64's (not-yet-merged)
  branch, rather than based directly on `main`.
- **What happened:** When PR #64 merged and its branch was deleted (standard
  squash-merge-and-delete-branch flow), GitHub auto-closed PR #65 instead of
  retargeting it — because #65's base branch no longer existed. The underlying commit
  wasn't lost, but the PR itself had to be recreated: the commit was rebased onto
  `main` and reopened as PR #66.
- **Outcome:** failure → recovered (see the matching Recovery Patterns entry)
- **Why this matters:** this is a property of GitHub itself, not a mistake in the
  code or the approval process — stacking a new branch on another unmerged branch
  carries a real, mechanical risk that has nothing to do with review quality.
- **Next-time guidance:**
  - Repeat when: n/a — this describes a limitation to plan around, not a move to
    repeat.
  - Avoid when: about to open a new branch while a related branch is still unmerged —
    stacking is sometimes reasonable (e.g. genuinely dependent work), but it should be
    a deliberate choice, not a default.
  - Check first: prefer basing new branches on `main` directly. If a real dependency
    forces stacking, expect the dependent PR to need a rebase-and-reopen once the base
    merges — budget for it rather than being surprised by it.
- **Confidence:** high
- **Review horizon:** stable — this is GitHub platform behavior, unlikely to change.
- **Status:** active
- **Memory worth:** success_uses: 0, failure_uses: 0
