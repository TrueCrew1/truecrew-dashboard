---
title: Agent Runbook § Approval Load
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [approval-load, chief-approvals]
related_prs: [71]
related_cards: []
---

# Agent Runbook § Approval Load

## Origin

`docs/AGENT_RUNBOOK.md` § **Approval Load** (see `knowledge/sources/pr-71-agent-runbook.md`
for the PR this shipped in — still unmerged as of this note, though the section text
itself is stable and has been exercised for real this session).

## Raw summary

States the point of a workflow is to make David's approval queue shorter, not longer.
Defines: hard per-workflow card caps (Planner 1–3, Build 0–3, Research ≤1, Content
≤1); when Chief bundles multiple findings into one card (same workflow run, same
underlying thing, same recommended decision — never bundle a disagreement); a
priority/load rule for surfacing high-impact items immediately, bundling
medium/low-impact same-decision internal items, and deferring overflow to the Chief
Weekly Digest; and the "External copy — no surprises" rule, which overrides bundling
entirely for anything external-facing, regardless of impact level.

## Extracted facts

- Exercised for real, not just theoretical: the 15-stale-PR-cleanup bundle, the
  PRs #75/#76/#77 dashboard-maintenance bundle, and the PR #57/#58 auth card being kept
  separate from the PR #78 Vercel-secret card are all real applications of this
  section's rules within this session.
- "External copy — no surprises" is stated twice in the runbook — once under Content's
  own section (the agent-side rule: always single-issue), once under Approval Load
  (Chief's enforcement side: split external items out of any bundle before presenting).

## Processed into

- [concepts/approval-load.md](../concepts/approval-load.md)
