---
title: Chief Approvals (the approval routing model)
type: concept
status: active
confidence: high
last_reviewed: 2026-07-20
created: 2026-07-04
updated: 2026-07-20
related_pages: [approval-load, tool-catalog]
related_prs: [64, 66, 67, 68, 71]
related_cards: []
---

# Chief Approvals (the approval routing model)

## Summary

Chief is the single path from any agent's output to David's decision. No agent —
Planner, Build, Research, Content — ever asks David directly; every gated action
becomes a typed `*ApprovalRequest` object, mapped through a
`createApprovalCardFrom*Request()` helper into an `ApprovalCard`, rendered in the Chief
Approval Panel (Chief → Approvals tab). David only ever decides through cards there.

## What works

- Core module: `src/components/chief/agentApprovalGates.ts`. `AgentRole` =
  `"planner" | "build" | "research" | "content"`. `APPROVAL_GATES` lists which actions
  per agent require a card; anything not listed is routine enough for the agent to
  just do.
- `riskLevel` (`low`/`medium`/`high`) maps mechanically to `recommendedDecision`
  (`approve`/`hold`/`needs_changes`) via `RISK_TO_RECOMMENDATION` — but Chief overrides
  this when a stated precondition is unmet (see the PR #57/#58 auth card: code risk is
  low, but recommendation is "hold" because secret-rotation confirmation is missing).
- Approve/Send back/Reject only ever update in-memory card state and the Chief Audit
  log — Chief never auto-merges, auto-deploys, or auto-messages externally from a card
  action.
- Real (non-illustrative) approval sources proven this session: a repo-change card,
  the Build agent's duplicate-auth-PR card, the Vercel Preview secret-scope card
  (#78), and the dashboard-maintenance bundle (#79). Planner, Research, and Content
  still run on illustrative `EXAMPLE_*` requests on `main` as of this note.
- Every gate in every agent's section of `docs/AGENT_RUNBOOK.md` applies in full
  regardless of Approval Load bundling/deferral — bundling changes presentation
  timing, never whether a gate-hit action needs a cleared card first.

## What to check first

- [SYSTEM_LAW_TRUTH_MERGE_DECISION_TABLE_V1.md](../../docs/SYSTEM_LAW_TRUTH_MERGE_DECISION_TABLE_V1.md)
  and the Chief **Decision Rubric** in `docs/AGENT_RUNBOOK.md` before recommending
  Approve / Hold / Reject on a merge-related card.
- `docs/agents/CHIEF_OPERATING_SYSTEM.md` for the short Chief mirror.
- `reference/tool-access.md` for which agent may use which tool before proposing a
  gated action involving an external system.
- Whether a stated precondition is unmet before recommending "approve" on risk level
  alone — see `decisions/auth-fix-secret-rotation.md` for the canonical example.
- `sources/pr-57-58-duplicate-auth-fix.md` as the template for how to reason about a
  precondition-blocked, otherwise-low-risk request.

## Open questions

- `docs/AGENT_RUNBOOK.md` — the document that fully specifies this model — is still
  unmerged (see `decisions/agent-runbook-adoption.md`). The model is real and actively
  used in practice, but its documentation isn't yet the merged source of truth.
- `APPROVAL_GATES.build` on `main` currently has 3 entries; the runbook documents a
  4th ("Changes to approval-related UX or logic"). Code and doc are known to be out
  of sync — see `lessons/check-code-not-runbook-prose.md`.

## Related

- Decisions: [agent-runbook-adoption](../decisions/agent-runbook-adoption.md), [auth-fix-secret-rotation](../decisions/auth-fix-secret-rotation.md)
- Sources: [pr-57-58-duplicate-auth-fix](../sources/pr-57-58-duplicate-auth-fix.md)
- Lessons: [check-code-not-runbook-prose](../lessons/check-code-not-runbook-prose.md)
