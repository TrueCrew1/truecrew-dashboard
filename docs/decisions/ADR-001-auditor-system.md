# ADR-001: Auditor system

**Status:** Accepted  
**Date:** 2026-07-07

## Context

True Crew runs agent-assisted work through Chief approvals, GitHub gate automation, and
serverless APIs. Operators and agents need a durable record of *what happened* — proposal
created, decision recorded, webhook processed — without mixing that record into
authorization or auto-execution.

The repo already has partial pieces: `audit_events` (server writes from GitHub handlers),
`chief_approval_decisions` (persisted operator decisions), and in-session governance
events in the Chief UI (`chiefGovernanceEvents.ts`). There is no single named system tying
these together.

## Decision

Adopt an **auditor system** as a cross-cutting **observability layer**, not an auth layer:

1. **Observability only** — audit records and governance events inform humans and future
   dashboards; they never approve, merge, deploy, or trigger agent work.
2. **Separate from Chief authorization** — a logged decision in the auditor does not execute
   anything. Execution stays explicit and human-in-the-loop ([AGENT_CONSTITUTION.md](../AGENT_CONSTITUTION.md)).
3. **Two tiers for now:**
   - **Client (session):** structured governance events (`approval_proposal_created`,
     `approval_decision_recorded`) via `chiefGovernanceEvents.ts` and the dev Governance
     panel — session-scoped and lower-trust; never persisted server-side.
   - **Server (durable):** `audit_events` inserts for webhook/system actions and for
     successful operator approval decisions in Chief (`chief.approval.<status>`, written
     by `/api/chief/approvals` alongside the decision write); `chief_approval_decisions`
     remains the decision record itself — the operator's approve/reject/send-back outcome
     for a proposal.
4. **Future sink (not implemented here):** a single read/query surface (API or Supabase
   view) may aggregate client and server events for Monitor or external review — sketched in
   [AGENT_RUNTIME_GOVERNANCE.md](../AGENT_RUNTIME_GOVERNANCE.md) §5.

New audit hooks must fail open: logging failures must not block approvals or API requests.

## Consequences

**Positive**

- Clear boundary between "what was recorded" and "what is allowed."
- Agents and approvers can reference one ADR instead of re-debating audit vs auth.
- Existing `audit_events` and governance event code fit the model without refactor.

**Negative / open**

- No unified audit query API yet — Monitor and Chief show slices, not full history.
- Client governance events are in-memory per session; not persisted until a sink exists.
- Codebase audit reports (e.g. repo scans for gaps) are manual/out-of-band — not part of
  this runtime auditor until a process is defined.

**Follow-up (out of scope for this ADR)**

- Persist governance events server-side when a sink is built.
- Expose read-only audit feed on Monitor or Settings.
- Document operator workflow for periodic repo/schema audits.
