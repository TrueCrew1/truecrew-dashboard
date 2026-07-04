---
title: Workflow Entry Points
type: reference
status: active
confidence: high
last_reviewed: 2026-07-04
related_pages: [chief-approvals]
related_prs: []
---

# Workflow Entry Points

Stable lookup — every Agent Workflow, how David triggers it, who owns it, and whether
it's gated. Full definitions live in `docs/AGENT_RUNBOOK.md` § Agent Workflows; this
page is for a fast "how do I ask for X" lookup, not the reasoning.

None of these run on a timer — David triggers each one by asking Chief by name.

| Workflow | Trigger phrase (example) | Owner | Gate |
|---|---|---|---|
| Weekly Planner Pass | "Ask Chief for a Weekly Planner Pass" | Planner | 1–3 cards at most, only for genuine roadmap judgment calls |
| Dashboard Maintenance Pass | "Ask Chief to run a dashboard maintenance pass" | Build (audit+fixes), Chief (bundling) | 0–3 cards, bundled per Approval Load |
| Daily Build Health Check | "Ask Chief for a Daily Build Health Check" | Build | 0–3 cards; merge/close always gated |
| Weekly Research Scan | "Ask Chief for a Weekly Research Scan" | Research | ≤1 card, only if it concludes adopt/drop |
| Weekly Content Tidy | "Ask Chief for a Weekly Content Tidy" | Content | ≤1 internal card; external copy always its own card |
| Chief Weekly Digest | "Ask Chief for the Weekly Digest" | Chief | none — reporting only |
| Research–Planner–Build Correlation Pass | "Ask Chief to run a Correlation Pass" | Chief | none for detection; findings route through the normal agent gate |
| Second Brain Starter Pass | "Ask Chief for a Second Brain Starter Pass" | Chief (+ Research, Content) | none, unless external-facing or a structural vault change |
| Memory Review Pass | "Ask Chief for a Memory Review Pass" | Chief | none — status/merge changes only, explicit-request or post-structural-change only |

## Related

- Runbook: `docs/AGENT_RUNBOOK.md` § Agent Workflows (full definitions), § Approval
  Load (bundling/deferral rules referenced above)
- Concept: [chief-approvals](../concepts/chief-approvals.md)
