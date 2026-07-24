# Research Agent v1 — Packet and Workflow Spec

Durable design reference for how Research Agent goes from a real signal to a Chief
`ApprovalCard`, using the `AgentPacket` and observability primitives already in the
repo. This is a spec for future implementation — it does not itself wire a Research
runner, and it changes no code.

**Sits under, does not replace:** `docs/AGENT_RUNBOOK.md` (§ Research Agent — purpose,
allowed-without-approval list, requires-approval list, verification steps) and
`docs/AGENT_APPROVAL_LOOPS.md` (system law, shared approval path, Research Agent loop
QA reference). Where this spec is silent, those docs govern. See
[BUILDER_AGENT_PACKET_SPEC.md](BUILDER_AGENT_PACKET_SPEC.md) for the equivalent spec on
the Build side — same shape, different agent.

## Purpose

Research Agent today is illustrative: one seeded example request
(`agentApprovalGates.ts` helpers; illustrative EXAMPLE_* seeds removed from Approvals)
and one docs-only QA proposal
(`researchAgentTestProposal.ts`, exercised from the Monitor page). Neither reads a real
signal or produces a real recommendation.

Research Agent v1 is the concrete design for closing that gap: Research reads existing
live signals (see Inputs), decides — using the same allowed/requires-approval split
`AGENT_RUNBOOK.md` already defines — whether a finding is a routine note or an
approval-worthy recommendation, and, for the latter, produces a typed, structured
`AgentPacket<ResearchApprovalRequest>` that flows into Chief's existing shared queue
exactly like Build's request does today. Nothing here adds a new decision path; it
gives Research a real, spec'd way to use the path that already exists.

## Packet type

v1 uses the existing `AgentPacket<TRequest>` (`src/components/chief/agentPacket.ts`)
specialized to `ResearchApprovalRequest` — no new type is introduced.

```ts
AgentPacket<ResearchApprovalRequest>
// = { id: string; agent: "research"; request: ResearchApprovalRequest; createdAt: string }
```

`ResearchApprovalRequest` itself is unchanged, defined in `agentApprovalGates.ts`:

| Field | Type | v1 Research usage |
|---|---|---|
| `id` | `string` | Stable per finding (see Packet creation) so re-observing the same signal doesn't duplicate a pending packet/card. |
| `gate` | `string` | One of `APPROVAL_GATES.research` — `"New tool or stack adoption"` or `"Vendor selection or contract decision"`. v1 does not add a third gate (see Constraints). |
| `summary` | `string` | What was observed and why it rises to a recommendation — name the source signal (incident id, alert id) plainly, not implicitly. |
| `riskLevel` | `"low" \| "medium" \| "high"` | Feeds Chief's existing mechanical `recommendedDecision` mapping — no new mapping. |
| `testsOrChecksDone` | `ApprovalChecklistItem[]` | Per `AGENT_RUNBOOK.md`'s Research verification steps: at least two options compared, claims checked against real docs (cite what was checked), Reliability/tool-fallback disclosure if a fallback was used. |
| `requestedAction` | `string` | The actual ask (adopt / don't adopt / hold for more comparison). |
| `alternativesConsidered` | `string[]` | The ≥2 options `AGENT_RUNBOOK.md` requires before this gate is used. |
| `createdAt` | `string` (ISO) | Set at packet creation. |

`packet.id` (not `request.id`) is namespaced by `createAgentPacket`
(`packet-research-${request.id}`) — the packet and the request keep distinct
identities, per `AgentPacket`'s existing "wraps, does not compete with" contract.

## Workflow

### Inputs

High-level signal categories Research reads, using data shapes that already exist in
`chiefLiveContext.ts` — v1 does not add a new data source:

- **Incidents** (`ChiefLiveContext.activeIncidents` / `data.incidents`) — Research is
  already the attributed specialist for incident signals elsewhere in the codebase
  (`deriveResearchAgentWorkItems` derives Research's Agents-tab lane directly from
  incident data). This is the one signal category with an existing real, live-derived
  precedent — start here.
- **Alerts** (`ChiefLiveContext.alerts`) — same shape Chief's Situation Brief and Board
  already surface; plausible Research input, not yet wired to Research specifically.
- **Monitor health / overdue and blocked tasks** (`blockingTasks`, `overdueTasks`) — at
  high level, context for whether an incident/alert pattern is a one-off or a
  recurring gap worth a tool/vendor look.
- **Knowledge gaps** (`tasksMissingCustomer`, `tasksMissingWorkflow`, and
  `knowledge/` per `AGENT_RUNBOOK.md`'s vault-first rule) — informs whether a finding
  duplicates something the vault already tracks (don't re-recommend a decision already
  made).

v1 does not require building new ingestion — it names which existing shapes a future
Research runner reads. Wiring an actual runner against these is Future work.

### Packet creation

A finding becomes a packet only when it clears the same bar `AGENT_RUNBOOK.md`
already sets for Research needing Chief approval — this spec does not lower or
reinterpret that bar:

- **Requires a packet** (mirrors "Requires Chief approval" in `AGENT_RUNBOOK.md`):
  recommending adoption or removal of a major tool or vendor; suggesting a stack
  change that would affect Build or production.
- **Does not require a packet** (mirrors "Allowed without approval"): internal-only
  research notes; cost/benefit comparisons that don't conclude in a recommendation.
  These stay as plain findings/notes — no `AgentPacket`, no card, no log event.

Before creating a packet, apply the same verification checklist
`AGENT_RUNBOOK.md` requires before asking for approval (≥2 options compared, claims
checked against real sources not memory, vault-checked for an existing decision on the
same topic, tool-fallback disclosed if used) — populate `testsOrChecksDone` from this
checklist directly rather than asking for approval first and justifying after.

**Deduplication:** derive `request.id` deterministically from the source signal (e.g.
`stableChiefId("apr-research", incident.id)`, same helper `researchAgentTestProposal.ts`
already uses for its QA proposal), so re-observing the same incident/alert while a
packet/card for it is still pending does not enqueue a duplicate — same
pending-only duplicate guard `AGENT_APPROVAL_LOOPS.md` documents for Build and the
Research QA test today.

### Routing

Exact required flow — no step skipped, no alternate path:

```
Research signal (incident / alert / monitor-health pattern)
  → Research applies AGENT_RUNBOOK.md's approval-required test
      → does not clear it → stays a note/log entry, no packet, done
      → clears it → continue
  → build a ResearchApprovalRequest (id, gate, summary, riskLevel,
    testsOrChecksDone, requestedAction, alternativesConsidered, createdAt)
  → createAgentPacket("research", request)     // agentPacket.ts
      — wraps the request; chiefLog.packetCreated fires here automatically
  → createApprovalCardFromResearchRequest(packet.request)  // agentApprovalGates.ts
      — maps to ApprovalCard { source: "research_agent", ... }
  → addCommandApproval(card)                   // ChiefApprovalsContext
  → shared approvals queue (merged with seeded + live-ops sources, same queue
    every other agent and source uses)
  → Chief → Approvals tab (pending card) / Chief → Agents → Awaiting approval
  → operator Approve / Reject / Send back      // recordDecision()
  → card leaves pending views; decision recorded, nothing auto-executes
```

This is the same shared path `AGENT_APPROVAL_LOOPS.md` already documents for Build and
for the Research QA test proposal — v1 does not introduce a parallel path. The only
thing v1 adds is the `AgentPacket` wrapping step between "Research decides this is
approval-worthy" and "a typed request exists" — a logging/observability seam, not a
new gate or a new queue.

### Logging

v1 uses `chiefLog` exactly as it exists today (`src/components/chief/chiefLog.ts`) —
no new event type is added by this spec:

| Routing step | `chiefLog` call | Wired today? |
|---|---|---|
| `createAgentPacket("research", request)` | `chiefLog.packetCreated(packet)` | **Yes** — fires automatically inside `createAgentPacket`; nothing extra to call. |
| `createApprovalCardFromResearchRequest(...)` | `chiefLog.cardCreated(card)` | Not yet — `agentApprovalGates.ts`'s factories don't call it today. A real Research runner implementation should add one `chiefLog.cardCreated(card)` line after building the card, same as any other agent's factory could. |
| `recordDecision(id, action)` resolving a Research-sourced card | `chiefLog.cardDecided(card, action)` | Not yet — `ChiefApprovalsContext.recordDecision` doesn't call it today. Same one-line addition, at the point the decision is applied. |

All three calls are best-effort and non-blocking by construction
(`emitChiefGovernanceEvent` swallows its own failures — see
`chiefGovernanceEvents.ts`) — nothing about wiring `cardCreated`/`cardDecided` changes
that contract. Wiring those two calls is a small, additive Build change (not a Research
change) when someone implements this spec — it does not require modifying
`ResearchApprovalRequest`, `AgentPacket`, or the queue itself.

**Not in v1:** a dedicated event type like `research_alert_observed` (naming a raw
signal observation, before it even becomes a packet) is a reasonable future addition
but does not exist in `ChiefGovernanceEventType` today
(`"packet_created" | "card_created" | "card_decided"` only). Adding it is its own small,
additive change to `chiefGovernanceEvents.ts` — out of scope for this spec and for v1.

## Constraints

Restated from `AGENT_RUNBOOK.md` and `AGENT_APPROVAL_LOOPS.md` — non-negotiable for any
implementation of this spec, not just for this document:

- **Chief is the only approval surface.** Research never asks the operator directly —
  in chat, in a side panel, anywhere outside a Chief `ApprovalCard`.
- **Human-in-the-loop, always.** Packet creation, card creation, and the operator's
  decision are three separate steps. None of them executes downstream work — no doc
  is written, no tool is adopted, no PR is opened, purely from a packet existing or a
  card being approved.
- **One shared queue.** Every Research packet's request still goes through
  `createApprovalCardFromResearchRequest()` → `addCommandApproval()` →
  `ChiefApprovalsContext`. `AgentPacket` wraps the request; it is never a second queue
  and never a bypass of this one.
- **Observability only.** Every `chiefLog` event described above is a record that
  something happened — never a trigger, never a decision, never a condition anything
  branches on.
- **No new infrastructure.** No new backend, database table, API route, or dependency.
  `AgentPacket`/`chiefLog`/`chiefGovernanceEvents` are reused exactly as they exist;
  session-scoped, in-memory, non-persistent, same as today.
- **No new gate, unilaterally.** v1 reuses `APPROVAL_GATES.research` as-is. If a real
  implementation later finds neither existing gate fits (the same tension
  `AGENT_APPROVAL_LOOPS.md` already flags as a known limitation for the Research QA
  test), adding a third gate is a change to `agentApprovalGates.ts` — routed through
  Chief as a **Build approval request** ("Changes to approval-related UX or logic"),
  same as any other change to approval structure, not something Research decides for
  itself.
- **TypeScript strict, no `any`, for any future implementation.** `ResearchApprovalRequest`
  and `AgentPacket<ResearchApprovalRequest>` are already fully typed; a real runner
  must not weaken that with a broad or `any`-typed intake layer.

## Future work

Explicitly out of scope for this spec:

- Implementing the actual Research runner (reading live incidents/alerts, applying the
  approval-required test, calling `createAgentPacket` for real).
- Wiring `chiefLog.cardCreated` / `chiefLog.cardDecided` into
  `createApprovalCardFromResearchRequest` and `ChiefApprovalsContext.recordDecision`.
- Any new `ChiefGovernanceEventType` (e.g. a raw-signal-observed event).
- Any UI surfacing beyond the existing Chief → Approvals card and the dev Governance
  Events panel / Recent activity strip.
- Persistence of packets, requests, or governance events beyond the current
  session-scoped in-memory model.
- Slack or voice intake into any part of this flow.
