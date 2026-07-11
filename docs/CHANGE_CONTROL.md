# Change Control

**What True Crew is building now — and how to propose work outside that scope.**

True Crew is a premium **operations and maintenance** SaaS command center (Today →
Operations → Builds → Monitor → Chief). This document prevents drift away from that
focus and the locked agent/governance plan. Major changes update these governance docs or add an ADR;
they are not merged ad hoc without stating intent.

---

## In scope (current program)

Work that directly advances the locked plan:

1. **Chief foreman system** — command intake, board, approvals, situation brief, agent coordination UI (`src/components/chief/`).
2. **Agent runtime** — job dispatch, containment, pre-flight checks, persistent work graph (planned; policy in [RUNTIME_GOVERNANCE.md](RUNTIME_GOVERNANCE.md)).
3. **Core agent roster** — the twelve roles in [AGENT_ECOSYSTEM.md](AGENT_ECOSYSTEM.md) (existing, partial, or missing — extending wired agents, not replacing the roster).
4. **Obsidian / repo / Notion sinks** — durable outputs per [SYSTEM_OF_RECORD.md](SYSTEM_OF_RECORD.md); Obsidian CLI and read API; repo governance docs; Notion sync when implemented.
5. **Monitoring + maintenance loops** — Monitor health, incident/triage, Today/work-orders, PM and maintenance backlog integration.
6. **Credit-reduction routing** — cheap-first model policy ([MODEL_ROUTING_POLICY.md](MODEL_ROUTING_POLICY.md)) applied to lanes, runtime tier tags, and agent defaults.

Secondary in-scope work: tests and APIs that support the above; operator UX that strengthens “what do I do next” on Today, Monitor, Builds, Chief.

---

## Out of scope (examples)

Do not start without a change request that overrides this section:

| Out of scope | Why |
|--------------|-----|
| Random new agents without defined role, sink, and trigger | Roster is locked in `AGENT_ECOSYSTEM.md` |
| Cosmetic UI that does not strengthen foreman, ops, or maintenance workflows | Drift from maintenance/ops focus |
| Deep autonomy (auto-execute on approve, unsupervised production changes) before runtime governance exists | [RUNTIME_GOVERNANCE.md](RUNTIME_GOVERNANCE.md) requires policy + containment first |
| Parallel approval surfaces (Slack approve, email approve, chat “ok”) | Chief is sole decision surface |
| Premium AI for tasks Tier 0–1 can handle | [MODEL_ROUTING_POLICY.md](MODEL_ROUTING_POLICY.md) |
| Important artifacts only in chat or session-scoped UI | [SYSTEM_OF_RECORD.md](SYSTEM_OF_RECORD.md) |
| Generic SaaS placeholder tone in new copy | Industrial, field-ops tone per `CLAUDE.md` |
| Features that do not serve supervisor/operator or maintenance workflows | Drift from command-center mission |

---

## Change request process

Every **major change** (new agent wiring, new sink, new approval gate, architecture shift,
autonomy increase, or roster change) must be stated before implementation:

### Required fields

1. **Why** — operator or maintenance value in one paragraph.
2. **Stage gate** — which in-scope pillar (§ above) it belongs to.
3. **Replaces or defers** — what existing work this supersedes or pushes back.
4. **Credit / governance / ops benefit** — at least one of: lower model cost, clearer
   containment, better audit, faster field/supervisor workflow.

### Documentation requirement

- **Architecture or boundary change** → new or updated ADR (`docs/decisions/` or `docs/adr/`).
- **Roster, sink, or policy change** → update `AGENT_ECOSYSTEM.md`, `SYSTEM_OF_RECORD.md`,
  `MODEL_ROUTING_POLICY.md`, or `RUNTIME_GOVERNANCE.md` in the same PR.
- **Routine slice inside approved spec** → PR summary per [PR_SUMMARY_TEMPLATE.md](PR_SUMMARY_TEMPLATE.md); no ADR required.

### Approval path

- Gated changes still require Chief approval per [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md).
- Doc-only governance updates that lock policy are approver-reviewed like any PR; they do not auto-change runtime behavior.

---

## ADR locations

| Path | Purpose |
|------|---------|
| `docs/adr/` | Foundational architecture (foreman, supervisor pattern) |
| `docs/decisions/` | Incremental implementation ADRs (auditor, auth, data shape) |

Do not renumber existing ADRs in `docs/decisions/`. New implementation ADRs continue at `ADR-003`, etc., per [decisions/README.md](decisions/README.md).

---

## Related docs

- [adr/0001-chief-foreman-architecture.md](adr/0001-chief-foreman-architecture.md) — foundational decision
- [AGENT_ECOSYSTEM.md](AGENT_ECOSYSTEM.md) — locked roster
- [EXECUTION_KIT.md](EXECUTION_KIT.md) — session kickoff and lanes
