# ADR 0001: Chief Foreman Architecture

**Status:** Accepted  
**Date:** 2026-07-07  
**Deciders:** True Crew founder / operator  

---

## Context

True Crew is a premium SaaS command center for **operations and maintenance** teams —
supervisors and operators in the field, not generic desk admins. The product needs a
coherent way to coordinate multiple AI-assisted specialists without losing control,
blowing model budgets, or archiving work in chat.

Today the repo has a Chief UI layer, a partial agent roster, GitHub gate automation, and
governance docs — but no full runtime orchestrator. Without an explicit architecture,
agents, sinks, and approval behavior drift across tools (Cursor, Continue, Claude) and
sessions.

We will use a **supervisor + bounded specialist** pattern: one foreman (Chief), many
narrow agents, human approval for irreversible actions, cheap-first model routing, and
durable outputs in Obsidian, repo markdown, and Notion.

---

## Decision

1. **Chief is the foreman / supervisor for all agents.** Chief is the **only** front-facing
   operator surface for status, routing, and approvals. Specialists never ask the operator
   for decisions directly — all gated work flows through Chief → Approvals.

2. **Agents are bounded specialists coordinated through Chief and the runtime.** Each
   agent has a defined role, trigger model, inputs, outputs, and delivery sinks (see
   [AGENT_ECOSYSTEM.md](../AGENT_ECOSYSTEM.md)). The runtime (when implemented) dispatches
   jobs, enforces containment, and records outcomes — Chief does not execute specialist work.

3. **Human approval is required for irreversible or external-impacting actions.** Merge to
   `main`, migrations, vendor adoption, public copy, gate overrides, and similar actions
   require an Approved Chief card before execution. Approval records the decision only; it
   does not auto-execute ([AGENT_CONSTITUTION.md](../AGENT_CONSTITUTION.md)).

4. **Free / cheap AI is used first; premium AI is reserved for high-stakes reasoning.**
   Tiered routing per [MODEL_ROUTING_POLICY.md](../MODEL_ROUTING_POLICY.md). One-shot
   premium prompts for low-tier tasks are out of policy.

5. **Durable outputs go into Obsidian, repo, and Notion — not just chat.** System of record
   rules per [SYSTEM_OF_RECORD.md](../SYSTEM_OF_RECORD.md). Slack (Scout bot) is delivery
   only; no important work lives only in Slack or model output.

6. **Runtime governance is containment + policy + audit — not audit alone.**
   [RUNTIME_GOVERNANCE.md](../RUNTIME_GOVERNANCE.md) defines the control model.

7. **In-scope work and changes are documented.** [CHANGE_CONTROL.md](../CHANGE_CONTROL.md)
   defines the program boundary and change request process.

---

## Consequences

### Positive

- **Easier governance and coordination** — one foreman, one approval queue, one roster.
- **Lower credit usage** — cheap-first routing and multi-pass refinement are policy, not optional.
- **Clear agent boundaries** — role, sink, and trigger per specialist; no ad hoc agents.
- **Aligned with maintenance/ops focus** — Maintenance and Monitoring agents explicit in roster.

### Negative / tradeoffs

- **Explicit runtime and persistent work graph required** — today's Chief UI is necessary but
  not sufficient for minimal-intervention operation; job dispatch and enforcement remain to build.
- **Notion and Slack integrations are planned sinks** — partial program until wired.
- **Two ADR directories** — foundational (`docs/adr/`) vs implementation (`docs/decisions/`);
  contributors must check both indexes.
- **Human-in-the-loop latency** — irreversible actions stay slower by design until policy
  explicitly allows automation with runtime guards.

### Follow-up (out of scope for this ADR)

- Implement agent runtime with pre-flight checks and job log.
- Wire Notion Clerk and Scout (Slack) delivery.
- Unified audit read API (extends [ADR-001 auditor system](../decisions/ADR-001-auditor-system.md)).
- Maintenance Agent on Today/work-orders and PM backlog.

---

## References

- [AGENT_ECOSYSTEM.md](../AGENT_ECOSYSTEM.md)
- [SYSTEM_OF_RECORD.md](../SYSTEM_OF_RECORD.md)
- [MODEL_ROUTING_POLICY.md](../MODEL_ROUTING_POLICY.md)
- [RUNTIME_GOVERNANCE.md](../RUNTIME_GOVERNANCE.md)
- [CHANGE_CONTROL.md](../CHANGE_CONTROL.md)
- [AGENT_CONSTITUTION.md](../AGENT_CONSTITUTION.md)
