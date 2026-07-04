---
title: Chief Approvals (the approval routing model)
type: concept
status: established
created: 2026-07-04
updated: 2026-07-04
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

## Established facts

- Core module: `src/components/chief/agentApprovalGates.ts`. `AgentRole` =
  `"planner" | "build" | "research" | "content"`. `APPROVAL_GATES` lists which actions
  per agent require a card; anything not listed is routine enough for the agent to just
  do.
- `riskLevel` (`low`/`medium`/`high`) maps mechanically to `recommendedDecision`
  (`approve`/`hold`/`needs_changes`) via `RISK_TO_RECOMMENDATION` — but Chief overrides
  this when a stated precondition is unmet (see the PR #57/#58 auth card: code risk is
  low, but recommendation is "hold" because secret-rotation confirmation is missing —
  `sources/pr-57-58-duplicate-auth-fix.md`).
- Approve/Send back/Reject only ever update in-memory card state and the Chief Audit
  log — Chief never auto-merges, auto-deploys, or auto-messages externally from a card
  action. Real automation of those actions is a documented extension point, not current
  behavior.
- Real (non-illustrative) approval sources proven this session: a repo-change card
  (the decision-reason feature WIP), the Build agent's duplicate-auth-PR card, the
  Vercel Preview secret-scope card (#78), and the dashboard-maintenance bundle (#79).
  Planner, Research, and Content still run on illustrative `EXAMPLE_*` requests on
  `main` as of this note — their real-request PRs (#72, README-tagline #74) are
  unmerged.
- Every gate in every agent's section of `docs/AGENT_RUNBOOK.md` applies in full
  regardless of Approval Load bundling/deferral — bundling changes presentation timing,
  never whether a gate-hit action needs a cleared card first.

## Open questions / inference

- `docs/AGENT_RUNBOOK.md` — the document that fully specifies this model — is still
  unmerged (PR #71, and now stale relative to `main`; see
  `decisions/agent-runbook-adoption.md`). The model is real and actively used in
  practice, but its documentation isn't yet the merged source of truth.
- `APPROVAL_GATES.build` on `main` currently has 3 entries; the runbook (and PR #69,
  also unmerged) documents a 4th ("Changes to approval-related UX or logic"). Code and
  doc are known to be out of sync — flagged, not yet reconciled.

## Related

- Pages: [approval-load](approval-load.md), [tool-catalog](tool-catalog.md)
- PRs: #64, #66, #67, #68, #71
- Decisions: [agent-runbook-adoption](../decisions/agent-runbook-adoption.md)
