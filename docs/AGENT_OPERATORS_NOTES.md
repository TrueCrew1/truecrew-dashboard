# Agent Operators Notes

Short, practical how-tos for operator-facing agent actions. This file is a
convenience appendix — it does **not** define governance. The rules of record
stay in `AGENT_RUNBOOK.md`, `AGENT_LANES_INTERNAL.md`, and
`RESEARCH_SECOND_BRAIN_WORKFLOW.md`.

## Planner — "Check overdue work" re-sequencing signal

**Where:** Operations page (`/operations`), top panel "Planner re-sequencing signal".

**What it does:** Reads the live set of open tasks that are past their due date
(`ChiefLiveContext.overdueTasks`). When any exist, it files a **Planner roadmap
re-sequencing proposal** into Chief's existing approval queue — the same path
Build and Research use (`*ApprovalRequest → createApprovalCardFromPlannerRequest()
→ addCommandApproval()`). Planner never changes the roadmap itself; it only
proposes, and the operator decides on Chief → Approvals.

**How to use it:**
1. Open `/operations`.
2. Click **Check overdue work**.
3. Read the inline feedback:
   - **Queued for operator approval** — a card was added to the Chief approval
     queue. Open **Chief → Approvals** to approve or hold it.
   - **Already awaiting approval** — a re-sequencing proposal is already pending;
     no duplicate is created.
   - **No overdue open tasks right now** — nothing is past due, so no card is
     filed (this is the truthful "no signal" case, not an error).

**What the queued card means:** Titled *"Planner: Roadmap reprioritization or
re-sequencing"*, it summarizes how many open tasks are past due and across which
workflow types (e.g. "2 open tasks past due across 2 workflow types (build
workflow, ticket workflow)"), with example task titles/ids. Recommendation is
**Hold** by default — approving means you accept re-sequencing current priorities
to clear the overdue work first; holding keeps the current order. Approval only
records the decision; it does not automatically execute any re-sequencing.

**Scope / limitations:**
- Operator-triggered (button), not an automatic on-load scan.
- Proposal only — no roadmap mutation, no new queue, route, or schema.
- Chief remains the only approval surface.
