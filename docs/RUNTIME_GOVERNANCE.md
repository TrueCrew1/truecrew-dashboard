# Runtime Governance

**Containment + runtime policy + audit — the control model for True Crew agents.**

Control model for an ops/maintenance command center where field supervisors approve
irreversible actions through Chief. Audit alone does not govern behavior. Control comes from three layers working together:

1. **Containment** — narrow access per agent and job
2. **Runtime policy** — what may run, what must stop for approval, what is forbidden
3. **Audit** — durable log of proposals, decisions, jobs, artifacts, and sink deliveries

Chief-specific approval invariants (INV-1–7) live in
[AGENT_RUNTIME_GOVERNANCE.md](AGENT_RUNTIME_GOVERNANCE.md). This document is the
ecosystem-wide runtime frame. **No enforcement code is required by this doc** — policy
first; implementation follows.

See [adr/0001-chief-foreman-architecture.md](adr/0001-chief-foreman-architecture.md).

---

## Containment rules

### Task-bound access

- Agents receive **only the inputs needed for the current job** — one proposal, one incident,
  one PR scope, one vault path. No broad repo trawling unless the job type explicitly allows it (e.g. Scout read-only inspect).
- Jobs are **time- and scope-boxed**. Completion or failure must be recorded; no silent hang.

### Role segmentation

- **Secrets and production credentials** are not available to Tier 1 lanes, Scout, or
  draft-only tools. Build/runtime lanes use env-scoped secrets; never embed in prompts or sinks.
- **Sink credentials** (Obsidian path, Notion token, Slack webhook) are segmented by agent
  role. An agent that reads Obsidian does not automatically gain Notion write access.
- **Chief** hosts decisions but does not hold implementation credentials for specialists.

### Environment boundaries

- **Production-impacting operations** require explicit environment tag (preview vs production)
  in the job record before execution.
- **Database migrations and merge to `main`** are production-impacting unless a written
  exception exists in an approved ADR.

---

## Runtime policy

### Requires explicit human approval (irreversible or external-impacting)

Aligned with `APPROVAL_GATES` in `src/components/chief/agentApprovalGates.ts` and Chief
constitutional laws:

| Category | Examples |
|----------|----------|
| **Build** | Merge to `main`; schema/DB migration; production-impacting refactor |
| **Research** | New tool/stack adoption; vendor/contract decision |
| **Planner** | Multi-phase scope change; new roadmap phase; reprioritization |
| **Content** | External-facing copy; public layout/design change |
| **Ops** | Gate override; deploy release hold override; customer/workflow link that affects SLA attribution; PM schedule change affecting crew dispatch |
| **Sinks** | Publishing to Notion shared views; customer-visible Slack (Scout); deleting durable artifacts |

Approval = **record decision on Chief → Approvals** (and persist via `/api/chief/approvals`
when live API on). Approval does **not** execute the action.

### Forbidden without runtime + approval stack

- Auto-merge on approve
- Auto-publish customer-facing content on approve
- Side-channel approval (chat “LGTM”, DM, Slack reaction as decision)
- Bypassing Chief queue for gated actions ([AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) Law 1–4)
- Writing secrets to Obsidian, repo, Notion, or Slack
- Agent self-granting broader tool access mid-job

### Pre-flight checks (before any dangerous operation)

Before executing an irreversible or external-impacting step, verify:

| Check | Question |
|-------|----------|
| **Approved?** | Is there an Approved Chief card (or explicit ungated routine action outside `APPROVAL_GATES`)? |
| **Correct agent?** | Does the job role match the agent roster entry ([AGENT_ECOSYSTEM.md](AGENT_ECOSYSTEM.md))? |
| **Correct environment?** | Preview vs production; correct Supabase project and deploy target. |
| **Correct sink?** | Primary SoR per [SYSTEM_OF_RECORD.md](SYSTEM_OF_RECORD.md); no chat-only archive. |
| **Reversible?** | If yes, still log; if no, approval is mandatory. |
| **Tier appropriate?** | Per [MODEL_ROUTING_POLICY.md](MODEL_ROUTING_POLICY.md) — no premium one-shot for cheap work. |

---

## Audit requirements

All of the following must be **loggable with actor, timestamp, rationale (when human), and outcome**:

| Event type | Durable store (today / planned) |
|------------|--------------------------------|
| Proposal created | Client governance events (session); future server sink |
| Approval decision | `chief_approval_decisions`; Obsidian `obsidian:log decision` |
| Job started / completed / failed | Runtime job log (planned) |
| Artifact written | Git commit, Obsidian path, Notion page id — referenced in job log |
| Sink delivery | Slack message id + link to Obsidian/repo mirror |
| Webhook / gate automation | `audit_events`; `github_webhook_deliveries` |
| Policy violation / escalation | Governance Agent → Chief queue (planned) |

**Fail open on logging errors** — a logging failure must not block an already-approved
human action (ADR-001). **Fail closed on execution** — missing approval must block
irreversible execution once runtime enforcement exists.

### Minimum decision record fields

- `proposalId` or job id
- `actor` (persona or agent role)
- `action` / `status`
- `timestamp`
- `rationale` (one line minimum for gated decisions — recommended today, required when runtime enforces)

---

## Control model summary

```
┌─────────────────────────────────────────────────────────┐
│  CONTAINMENT — narrow inputs, segmented secrets/sinks      │
├─────────────────────────────────────────────────────────┤
│  RUNTIME POLICY — approve / forbid / pre-flight checks   │
├─────────────────────────────────────────────────────────┤
│  AUDIT — reconstruct who did what, when, why, outcome    │
└─────────────────────────────────────────────────────────┘
```

Audit without containment and policy records what went wrong after the fact. Policy without
audit cannot be reconstructed. **All three are required** for agents running with minimal
human intervention without losing control.

---

## Current implementation status

| Layer | Today | Next |
|-------|-------|------|
| Containment | Docs + lane conventions; no job sandbox | Runtime job scopes per agent |
| Runtime policy | Chief gates + constitutional docs; manual pre-check | Automated pre-flight on job dispatch |
| Audit | `chief_approval_decisions`, `audit_events`, session governance events | Unified audit read API (ADR-001 follow-up) |

---

## Related docs

- [AGENT_RUNTIME_GOVERNANCE.md](AGENT_RUNTIME_GOVERNANCE.md) — INV-1–7 and session pre-check block
- [decisions/ADR-001-auditor-system.md](decisions/ADR-001-auditor-system.md) — observability-only auditor
- [AGENT_ECOSYSTEM.md](AGENT_ECOSYSTEM.md) — roster and triggers
- [CHANGE_CONTROL.md](CHANGE_CONTROL.md) — what not to build before runtime exists
