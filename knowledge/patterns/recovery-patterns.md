---
title: Recovery Patterns
type: pattern
status: active
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals]
related_prs: [65, 66]
related_cards: []
---

# Recovery Patterns

What worked to recover after something went wrong. One dated entry per learning,
merged into this single page.

#### 2026-07-04 — Rebase the orphaned commit onto main and reopen as a new PR

- **Pattern type:** Recovery
- **Agent:** Build
- **Workflow:** ad hoc PR sequencing (Chief Approval Panel work, PR #64/#65/#66) —
  direct recovery from the Constraints entry above (GitHub auto-closing a stacked PR)
- **Context:** PR #65 was auto-closed by GitHub when its stacked base branch (PR #64)
  was deleted on merge. The commit itself still existed; only the PR wrapper was gone.
- **What happened:** Rebased the same commit directly onto current `main`, pushed it
  as a fresh branch, and opened a new PR (#66) carrying identical content. Commented
  on the closed #65 marking it superseded, for a clean audit trail. Merged #66
  normally afterward.
- **Outcome:** success
- **Why this matters:** the recovery is small, mechanical, and fully preserves the
  original work — no content was rewritten or re-reviewed from scratch, just
  re-based and re-opened. It's a repeatable, low-risk fix for this specific failure
  mode.
- **Next-time guidance:**
  - Repeat when: a PR is auto-closed because its stacked base branch was deleted, and
    the commit itself is still intact (check `git log` on the old branch ref before
    assuming it's gone).
  - Avoid when: the underlying commit has actually been lost (e.g. the branch itself
    was deleted, not just closed) — this recovery only works because the branch ref
    survived; if it didn't, this is a bigger problem than a rebase fixes.
  - Check first: confirm the old branch/commit still exists (`git branch -a`,
    `git log <old-ref>`) before starting the rebase, and comment on the closed PR
    linking to its replacement so the history stays traceable.
- **Confidence:** high
- **Review horizon:** stable.
- **Status:** active
- **Memory worth:** success_uses: 0, failure_uses: 0
