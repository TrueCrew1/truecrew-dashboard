---
title: Merge the Agent Runbook to main
type: decision
status: pending
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals, approval-load, tool-catalog]
related_prs: [71, 69, 70]
related_cards: []
---

# Merge the Agent Runbook to main

**Status: pending**

## What was decided

Not yet merged. `docs/AGENT_RUNBOOK.md` has been iterated on extensively (Overview,
per-agent sections, Agent Workflows, Approval Load, Tool Catalog, External Services
Tool Catalog) on branch `docs/agent-runbook` / PR #71, but that PR is still open —
and has become **stale relative to `main`** on several unrelated files
(`agentApprovalGates.ts`, `approvalStatus.ts`, `KnowledgePage.tsx`, `MonitorPage.tsx`,
`DataContext.tsx`, `src/components/ui/index.tsx`) because other PRs (#68, #75, #76,
#77) landed on `main` after PR #71's branch was cut.

This Second Brain Starter Pass worked around the staleness by copying the runbook's
*content* fresh onto a new branch (based on current `main`) rather than adding more
commits to the stale branch — meaning there are now, in effect, two places the runbook
content exists: the original stale PR #71, and this pass's fresh copy (extended with
the Second Brain Starter Pass workflow and Knowledge Maintenance rules). **Someone
needs to decide which one actually merges** — this note exists specifically to make
that visible rather than let two versions drift further apart silently.

## Why

The runbook is real, has been followed in practice all session (bundling rules
exercised, escalation rules exercised, tool classifications exercised against a real
Vercel check), and is overdue to become the actual merged source of truth rather than
an unmerged-but-operative convention.

## Alternatives considered

- **Rebase PR #71 onto `main` and add the new sections there** — more "correct" in
  version-control terms, but riskier: PR #71's branch diff against `main` on the
  unrelated files would need manual conflict resolution, for no benefit over starting
  fresh.
- **Start fresh on a new branch (chosen for this pass)** — avoids the conflict-prone
  rebase, at the cost of PR #71 becoming redundant once this pass's PR merges.
- **Do nothing until #71 is resolved** — rejected; the Second Brain Starter Pass
  workflow needed to exist somewhere real today, and waiting indefinitely for an
  unrelated PR to get reviewed would block this pass without cause.

## Related PRs / cards

- PRs: #71 (stale, likely superseded — recommend closing once this pass's PR merges),
  #69 (4th Build gate, also unmerged), #70 (auth-fix card analysis, also unmerged)
- ApprovalCards: none — this is a Build-style repo/docs change, not yet formalized as
  its own `ApprovalRequest`; worth doing if/when the PR-71-vs-this-pass question is
  actually resolved.
