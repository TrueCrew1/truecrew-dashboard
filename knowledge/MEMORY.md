# MEMORY

Check this file first, before anything else in `knowledge/`. It's a small, curated
index — one line per entry, link + why it matters. For the complete map of every page,
see [index.md](index.md) instead; open only what's linked below that's relevant to the
task at hand, per `docs/AGENT_RUNBOOK.md` § Memory Architecture's retrieval order
(0a: read this file → 0b: open only the relevant linked pages → 0c: summarize before
acting).

## Active priorities

**This section is vault-internal decisions, not the dashboard's actual operator
priority.** Per the Chief Intake Rule (`docs/AGENT_RUNBOOK.md`), the real active
Priority and Current Task live in Obsidian — `True Crew/Master Priority List.md`
(top-level, cross-project: Dashboard → Painting App V2 → Targets/Growth),
`01_DASHBOARD/Current Priority List.md` (execution detail within Priority 1), and the
active-task doc — and must be read separately, every time, before planning or
execution. Don't treat this list as a substitute for that check.

- [decisions/agent-runbook-adoption](decisions/agent-runbook-adoption.md) — the
  Agent Runbook itself is unmerged and has two versions in flight; check before citing
  a runbook section as "settled, merged policy."
- [decisions/vercel-preview-secret-scope](decisions/vercel-preview-secret-scope.md) —
  open call on PR #78; don't re-investigate, it's already analyzed.
- [decisions/auth-fix-secret-rotation](decisions/auth-fix-secret-rotation.md) — PR #58
  blocked on a human-only secret-rotation confirmation; don't propose merging it.

## Core concepts

- [concepts/chief-approvals](concepts/chief-approvals.md) — the approval routing
  model: agents never ask David directly, every gated action becomes a card. Check
  before creating any `*ApprovalRequest`.
- [concepts/approval-load](concepts/approval-load.md) — rules for bundling/deferring
  cards without weakening a gate. Apply before creating any `ApprovalCard`.
- [concepts/dashboard-maintenance](concepts/dashboard-maintenance.md) — safe pattern
  for small, low-risk dashboard fixes and PR bundles. Check before dashboard-audit
  work.
- [concepts/tool-catalog](concepts/tool-catalog.md) — which agent may use which tool,
  at what access level. Check before calling any external tool/API.
- [concepts/vercel-status-checks](concepts/vercel-status-checks.md) — the read-only
  pattern for checking Vercel deploy/runtime state. Check before any Vercel call.
- [concepts/second-brain-workflow](concepts/second-brain-workflow.md) — how this
  vault itself is governed (caps, priority order, safeguards). Check before adding a
  new vault page of any kind.

## Current projects

- [projects/truecrew-dashboard](projects/truecrew-dashboard.md) — the umbrella
  project; start here for "what's the current state of the dashboard."
- [projects/dashboard-audit-july-2026](projects/dashboard-audit-july-2026.md) — the
  audit behind PRs #75/#76/#77; check before starting a new dashboard audit so you
  don't re-find what's already fixed or already deferred.
- [projects/second-brain-setup](projects/second-brain-setup.md) — this vault's own
  build history.

## High-value lessons

- [lessons/reverify-state-before-acting](lessons/reverify-state-before-acting.md) —
  re-check real PR/branch state immediately before merging or presenting a card, not
  just at discovery time. Apply before any merge/close/present action.
- [lessons/bundle-same-decision-cards](lessons/bundle-same-decision-cards.md) —
  bundle same-decision findings into one `ApprovalCard`. Apply when creating a card
  for multiple related findings.
- [lessons/github-stacked-branch-autoclose](lessons/github-stacked-branch-autoclose.md)
  — GitHub auto-closes a PR when its stacked base branch is deleted on merge. Check
  before opening a branch on top of another unmerged branch.
- [lessons/rebase-and-reopen-recovery](lessons/rebase-and-reopen-recovery.md) — how to
  recover from the constraint above (rebase onto `main`, reopen).
- [lessons/check-code-not-runbook-prose](lessons/check-code-not-runbook-prose.md) —
  verify the actual code array/enum, not just the runbook's prose, before referencing
  an indexed gate. Check before drafting a card that indexes into `APPROVAL_GATES.*`.

## Stable references

- [reference/tool-access](reference/tool-access.md) — quick lookup table: which agent,
  which tool, what access level, what gate.
- [reference/workflow-entry-points](reference/workflow-entry-points.md) — every Agent
  Workflow, its trigger phrase, owner, and gate, at a glance.
