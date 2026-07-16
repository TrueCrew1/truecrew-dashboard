# Builder Agent v1 — Packet and Workflow Spec

Durable design reference for how Build Agent goes from a real signal to a Chief
`ApprovalCard`, using the `AgentPacket` and observability primitives already in the
repo. This is a spec for future implementation — it does not itself wire a Build
runner, and it changes no code.

**Sits under, does not replace:** `docs/AGENT_RUNBOOK.md` (§ Build Agent — purpose,
allowed-without-approval list, requires-approval list, verification steps) and
`docs/AGENT_APPROVAL_LOOPS.md` (system law, shared approval path, Build Agent loop QA
reference). Where this spec is silent, those docs govern. See
[RESEARCH_AGENT_PACKET_SPEC.md](RESEARCH_AGENT_PACKET_SPEC.md) for the equivalent spec
on the Research side — same shape, different agent.

## Purpose

Build Agent today has two paths, neither of which reads a live signal and turns it
into a packet at request time: one real, verified example wired directly as a seeded
card (`BUILD_REQUEST_DUPLICATE_AUTH_FIX`, PR #57 vs #58 — verified via `gh pr diff`/
`gh pr view`, not mocked, but hand-authored rather than produced by a runner), and a
runtime QA proposal (`buildAgentTestProposal.ts`, exercised from the Builds page) that
produces a real pending card but for a fixed docs-only test file, not a real code
change.

Build Agent v1 is the concrete design for closing that gap: Build reads existing live
signals (see Inputs), decides — using the same allowed/requires-approval split
`AGENT_RUNBOOK.md` already defines — whether a change is routine (ships without a
card) or gate-worthy, and, for the latter, produces a typed, structured
`AgentPacket<BuildApprovalRequest>` that flows into Chief's existing shared queue the
same way the duplicate-auth-fix card already does today. Nothing here adds a new
decision path; it gives Build a real, spec'd way to produce what it already produces
by hand.

## Packet type

v1 uses the existing `AgentPacket<TRequest>` (`src/components/chief/agentPacket.ts`)
specialized to `BuildApprovalRequest` — no new type is introduced.

```ts
AgentPacket<BuildApprovalRequest>
// = { id: string; agent: "build"; request: BuildApprovalRequest; createdAt: string }
```

`BuildApprovalRequest` itself is unchanged, defined in `agentApprovalGates.ts`:

| Field | Type | v1 Build usage |
|---|---|---|
| `id` | `string` | Stable per change (see Packet creation) so re-detecting the same gate/PR state doesn't duplicate a pending packet/card. |
| `gate` | `BuildApprovalGate` | One of the four typed gates in `BUILD_APPROVAL_GATES` — `"Code change merging to main"`, `"Database or schema migration"`, `"Production-impacting refactor"`, `"Changes to approval-related UX or logic"`. Build is the only agent whose `gate` is a closed type, not a plain string — v1 does not weaken that. |
| `summary` | `string` | What the change is and why it needs a card — name the PR/branch/file plainly (per `BUILD_REQUEST_DUPLICATE_AUTH_FIX`'s pattern), not implicitly. |
| `riskLevel` | `"low" \| "medium" \| "high"` | Feeds Chief's existing mechanical `recommendedDecision` mapping — no new mapping. If a stated precondition is unmet (e.g. "don't merge until X is confirmed"), `AGENT_RUNBOOK.md` requires the risk/recommendation reflect that, not just the code. |
| `testsOrChecksDone` | `ApprovalChecklistItem[]` | Per `AGENT_RUNBOOK.md`'s Build verification steps: tests actually run (`npm run qa` or equivalent) and the real result recorded, never a claimed-but-unrun check. |
| `requestedAction` | `string` | The actual ask (merge / hold / close as duplicate, etc.). |
| `filesOrAreas` | `string[]` | Files/areas touched — required so the card names its blast radius, same as `BUILD_REQUEST_DUPLICATE_AUTH_FIX`'s `["lib/auth.ts"]`. |
| `createdAt` | `string` (ISO) | Set at packet creation. |

`packet.id` (not `request.id`) is namespaced by `createAgentPacket`
(`packet-build-${request.id}`) — the packet and the request keep distinct identities,
per `AgentPacket`'s existing "wraps, does not compete with" contract.

## Workflow

### Inputs

High-level signal categories Build reads, using data shapes that already exist —
v1 does not add a new data source:

- **Build-workflow tasks** (`Task[]` filtered to `workflowType === "build"`) — the one
  signal category with an existing real, live-derived precedent:
  `deriveBuildAgentWorkItems` already derives Build's Agents-tab lane from each task's
  `gates`, `blocker`, and `stage`. Open required gates and an active blocker are the
  live signal for "this task needs a decision," same fields v1 reads.
- **PR/CI state** (via whatever GitHub access the running agent has) — the real
  precedent, `BUILD_REQUEST_DUPLICATE_AUTH_FIX`, was built from external PR/CI facts
  (two PRs, identical diff, both green, both mergeable), not from an in-app data
  shape. v1 treats this the same way: real, but externally checked per request, not a
  `chiefLiveContext.ts` field today.
- **Migration/schema and approval-logic diffs** — the two gates
  (`"Database or schema migration"`, `"Changes to approval-related UX or logic"`)
  that have no dedicated live signal yet; v1 names them as inputs a runner must detect
  (e.g. diffing changed files against `supabase/migrations/` or
  `src/components/chief/`), not as something already derived.

v1 does not require building new ingestion — it names which existing shapes (and
which external checks) a future Build runner reads. Wiring an actual runner against
these is Future work.

### Packet creation

A change becomes a packet only when it clears the same bar `AGENT_RUNBOOK.md` already
sets for Build needing Chief approval — this spec does not lower or reinterpret that
bar:

- **Requires a packet** (mirrors "Requires Chief approval" in `AGENT_RUNBOOK.md`):
  merges to `main` or production-related branches; new migrations or schema changes;
  changes to approval-related logic or UX; any work affecting security/auth or
  external APIs; production-impacting refactors generally.
- **Does not require a packet** (mirrors "Allowed without approval"): tiny refactors
  and non-breaking improvements in feature branches; test fixes and local dev tooling
  tweaks; running builds, lint, and tests. These ship without a card, same as today.

Before creating a packet, apply the same verification checklist `AGENT_RUNBOOK.md`
requires before asking for approval (tests actually run and the real result recorded,
files touched listed, risk level reflecting any unmet precondition) — populate
`testsOrChecksDone` from this checklist directly, same as
`BUILD_REQUEST_DUPLICATE_AUTH_FIX` already does (`"Both PRs green on CI and mergeable
against main"` — a checked fact, not an assumed one).

**Deduplication:** derive `request.id` deterministically from the source change (e.g.
`stableChiefId("apr-build", prNumberOrBranch)`, same helper `buildAgentTestProposal.ts`
already uses for its QA proposal), so re-detecting the same PR/gate state while a
packet/card for it is still pending does not enqueue a duplicate — same pending-only
duplicate guard `AGENT_APPROVAL_LOOPS.md` documents for the Build QA test today.

### Routing

Exact required flow — no step skipped, no alternate path:

```
Build signal (open gate on a build task / PR-CI state / migration diff)
  → Build applies AGENT_RUNBOOK.md's approval-required test
      → does not clear it → ships directly (tiny refactor, test fix, tooling
        tweak), no packet, done
      → clears it → continue
  → build a BuildApprovalRequest (id, gate, summary, riskLevel,
    testsOrChecksDone, requestedAction, filesOrAreas, createdAt)
  → createAgentPacket("build", request)        // agentPacket.ts
      — wraps the request; chiefLog.packetCreated fires here automatically
  → createApprovalCardFromBuildRequest(packet.request)      // agentApprovalGates.ts
      — maps to ApprovalCard { source: "agent_build", ... }
  → addCommandApproval(card)                    // ChiefApprovalsContext
  → shared approvals queue (merged with seeded + live-ops sources, same queue
    every other agent and source uses)
  → Chief → Approvals tab (pending card) / Chief → Agents → Awaiting approval
  → operator Approve / Reject / Send back       // recordDecision()
  → card leaves pending views; decision recorded, nothing auto-executes —
    no merge, no deploy, no migration runs from the decision alone
```

This is the same shared path `AGENT_APPROVAL_LOOPS.md` already documents for Build's
duplicate-auth-fix card and for the Build QA test proposal — v1 does not introduce a
parallel path. The only thing v1 adds is the `AgentPacket` wrapping step between
"Build decides this is gate-worthy" and "a typed request exists" — a
logging/observability seam, not a new gate or a new queue.

### Logging

v1 uses `chiefLog` exactly as it exists today (`src/components/chief/chiefLog.ts`) —
no new event type is added by this spec:

| Routing step | `chiefLog` call | Wired today? |
|---|---|---|
| `createAgentPacket("build", request)` | `chiefLog.packetCreated(packet)` | **Yes** — fires automatically inside `createAgentPacket`; nothing extra to call. |
| `createApprovalCardFromBuildRequest(...)` | `chiefLog.cardCreated(card)` | Not yet — `agentApprovalGates.ts`'s factories don't call it today. A real Build runner implementation should add one `chiefLog.cardCreated(card)` line after building the card, same as any other agent's factory could. |
| `recordDecision(id, action)` resolving a Build-sourced card | `chiefLog.cardDecided(card, action)` | Not yet — `ChiefApprovalsContext.recordDecision` doesn't call it today. Same one-line addition, at the point the decision is applied. |

All three calls are best-effort and non-blocking by construction
(`emitChiefGovernanceEvent` swallows its own failures — see
`chiefGovernanceEvents.ts`) — nothing about wiring `cardCreated`/`cardDecided` changes
that contract. Wiring those two calls is a small, additive change when someone
implements this spec — it does not require modifying `BuildApprovalRequest`,
`AgentPacket`, or the queue itself. Because Build's own gate list includes "Changes to
approval-related UX or logic," wiring these two calls is itself gate-worthy — it goes
through a `BuildApprovalRequest` and a card like any other approval-logic change, not
a direct edit.

**Not in v1:** a dedicated event type distinguishing, say, a migration-triggered packet
from a merge-triggered one is a reasonable future refinement but does not exist in
`ChiefGovernanceEventType` today (`"packet_created" | "card_created" | "card_decided"`
only — the existing `packet_created` summary already names the gate, which is enough
signal for v1). Adding a new type is its own small, additive change to
`chiefGovernanceEvents.ts` — out of scope for this spec and for v1.

## Constraints

Restated from `AGENT_RUNBOOK.md` and `AGENT_APPROVAL_LOOPS.md` — non-negotiable for any
implementation of this spec, not just for this document:

- **Chief is the only approval surface.** Build never asks the operator directly — in
  chat, in a side panel, anywhere outside a Chief `ApprovalCard`.
- **Human-in-the-loop, always.** Packet creation, card creation, and the operator's
  decision are three separate steps. None of them executes downstream work — no merge
  happens, no migration runs, no deploy fires, purely from a packet existing or a card
  being approved. (`AGENT_APPROVAL_LOOPS.md`'s "Known limitations" already documents
  this exact decision-only behavior for Build today; v1 does not change it.)
- **One shared queue.** Every Build packet's request still goes through
  `createApprovalCardFromBuildRequest()` → `addCommandApproval()` →
  `ChiefApprovalsContext`. `AgentPacket` wraps the request; it is never a second queue
  and never a bypass of this one.
- **Observability only.** Every `chiefLog` event described above is a record that
  something happened — never a trigger, never a decision, never a condition anything
  branches on.
- **No new infrastructure.** No new backend, database table, API route, or dependency.
  `AgentPacket`/`chiefLog`/`chiefGovernanceEvents` are reused exactly as they exist;
  session-scoped, in-memory, non-persistent, same as today.
- **No new gate, unilaterally.** v1 reuses `BUILD_APPROVAL_GATES` as-is. If a real
  implementation later finds none of the four existing gates fit a new kind of
  build-time decision, adding a fifth gate is itself a change to
  `agentApprovalGates.ts` — routed through Chief as a **Build approval request**
  ("Changes to approval-related UX or logic"), same as any other change to approval
  structure, not something Build decides for itself.
- **TypeScript strict, no `any`, for any future implementation.** `BuildApprovalRequest`
  and `AgentPacket<BuildApprovalRequest>` are already fully typed, with `gate` closed to
  `BuildApprovalGate`; a real runner must not weaken that with a broad or `any`-typed
  intake layer.

## Future work

Explicitly out of scope for this spec:

- Implementing the actual Build runner (reading live task gates/PR-CI state/migration
  diffs, applying the approval-required test, calling `createAgentPacket` for real).
- Wiring `chiefLog.cardCreated` / `chiefLog.cardDecided` into
  `createApprovalCardFromBuildRequest` and `ChiefApprovalsContext.recordDecision`
  (itself gate-worthy per Constraints above).
- Any new `ChiefGovernanceEventType` (e.g. a gate-type-specific event).
- Any UI surfacing beyond the existing Chief → Approvals card and the dev Governance
  Events panel / Recent activity strip.
- Persistence of packets, requests, or governance events beyond the current
  session-scoped in-memory model.
- Slack or voice intake into any part of this flow.
