---
title: PR #71 — Agent Runbook created and installed
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [agent-runbook-adoption, chief-approvals]
related_prs: [71, 69, 70]
related_cards: []
---

# PR #71 — Agent Runbook created and installed

## Origin

[PR #71](https://github.com/TrueCrew1/truecrew-dashboard/pull/71), branch
`docs/agent-runbook`. Build Log entries: "Agent Runbook created" (commit `58e024f`),
"Agent Runbook installed" (commit `2148939`), "Agent Workflows added to the runbook"
(commit `e24a89e`), plus several later commits (Approval Load section, Tool Catalog,
External Services Tool Catalog, Research–Planner–Build Correlation Pass, "External
copy — no surprises" rule).

## Raw summary

Created `docs/AGENT_RUNBOOK.md` — the operating contract for Planner, Build, Research,
Content, and Chief: purpose/scope per agent, what's allowed without approval, what
needs a Chief `ApprovalCard`, the exact request-object → card field mapping, plus
Common Principles, Incidents/Escalation, Change Control, five recurring Agent
Workflows, Approval Load (bundling/deferral rules), a Tool Catalog, and an External
Services Tool Catalog. Wired references into `docs/AGENT_WORKFLOW.md` and
`agentApprovalGates.ts`'s header comment.

## Extracted facts

- As of 2026-07-04, **PR #71 is still OPEN, unmerged** against `main`. `main` does not
  yet have `docs/AGENT_RUNBOOK.md` on it.
- The `docs/agent-runbook` branch is now **stale relative to `main`** on unrelated
  files (`agentApprovalGates.ts`, `approvalStatus.ts`, `KnowledgePage.tsx`,
  `MonitorPage.tsx`, `DataContext.tsx`, `src/components/ui/index.tsx`) because several
  other PRs (#68, #75, #76, #77) landed on `main` after this branch was cut.
- The runbook's Build section references a 4th `BuildApprovalGate`
  ("Changes to approval-related UX or logic") that ships in still-open PR #69 — the
  runbook's prose and the code's `APPROVAL_GATES.build` array are not yet in sync on
  `main`.

## Processed into

- [decisions/agent-runbook-adoption.md](../decisions/agent-runbook-adoption.md) —
  whether/how to merge the runbook (pending; also notes the stale-branch problem this
  source note surfaced).
- [concepts/chief-approvals.md](../concepts/chief-approvals.md) — the runbook is the
  primary source for how Chief's approval routing is supposed to work.
