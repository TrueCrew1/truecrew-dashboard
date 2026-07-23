# Agent approval loops (Build + Research + Planner)

Durable reference for how Build, Research, and Planner agent proposals enter Chief's
approval queue today. Describes the system as it exists — not a roadmap.

## System law

- **Chief is the only approval surface.** No agent asks the operator for a decision
  directly (no side-channel asks, no “please approve this” in chat).
- **Human-in-the-loop always.** The operator decides on Chief → **Approvals** (Approve,
  Send back, or Reject). That decision is recorded; it does **not** execute agent
  work, create files, or advance workflows.
- **One shared queue.** Runtime proposals, seeded examples, live ops derivations, and
  command intake all merge in `ChiefApprovalsContext`. Chief → Approvals, Chief →
  Agents → Awaiting approval, and pending counts read the same `approvals` array.

## Shared approval path

Every runtime test proposal (and every agent integration that follows the same
pattern) uses this shared path. New approval paths must conform — do not introduce
alternate queues or bypass this sequence.

```
Operator trigger (page button)
  → *ApprovalRequest factory (e.g. buildResearchAgentTestRequest)
  → createApprovalCardFrom*Request()   // maps to ApprovalCard + source tag
  → addCommandApproval(card)           // ChiefApprovalsContext
  → shared approvals queue (in-memory, merged with seeded and live ops sources)
  → Chief → Approvals tab              // pending card, operator actions
  → Chief → Agents → Awaiting approval // live row for mapped agent
  → operator Approve / Reject / Send back
  → recordDecision()                   // decision overlay on proposal
  → card leaves pending Approvals + Agents awaiting views
```

For future Chief voice/text intake behavior, see `docs/CHIEF_VOICE_AND_COMMAND_SPEC.md`. This spec defines input behavior only and does not change the Chief-only approval model.

**Persistence today:**

- Proposal content is session-scoped (not stored in Supabase).
- Only decisions persist when `VITE_USE_LIVE_API=true` (table `chief_approval_decisions`
  via `/api/chief/approvals`).

**Agent mapping:**

- Pending proposals map to an Agents-tab row when `source` or `specialist` resolves to
  an agent (`deriveAgentAwaitingApprovalWorkItems` in `chiefLiveContext.ts`).
- Unmapped proposals are omitted — not guessed.

## Build Agent loop

Validated end-to-end QA path (runtime trigger, not seeded data only).

| Item | Current behavior |
|------|------------------|
| **Trigger** | **Builds** page → panel **Build Agent approval test** → **Propose test change** |
| **Factory** | `src/components/chief/buildAgentTestProposal.ts` |
| **Enqueue** | `enqueueBuildAgentTestProposal(approvals)` → `addCommandApproval(card)` |
| **Proposal** | Docs-only QA note: `docs/build-agent-approval-test.md` |
| **Gate** | `APPROVAL_GATES.build[0]` — “Code change merging to main” |
| **Card source** | `agent_build` |
| **Approvals title** | **Build: Code change merging to main** (disambiguate by summary mentioning the docs test file) |
| **Agents lane** | **Build Agent**, `live` badge, note: “Operator decision pending — review on Approvals tab.” |
| **Duplicate guard** | Stable ID `BUILD_AGENT_TEST_PROPOSAL_ID`; block while a proposal with that ID is **pending** |

**Disambiguation:** A separate seeded card also titled **Build: Code change merging to
main** covers duplicate auth PRs (#57/#58). The runtime test card is the one whose
summary references `build-agent-approval-test.md`.

## Research Agent loop

Validated end-to-end QA path (runtime trigger, parallel to Build).

| Item | Current behavior |
|------|------------------|
| **Trigger** | **Monitor** page → panel **Research Agent approval test** → **Propose test investigation** |
| **Factory** | `src/components/chief/researchAgentTestProposal.ts` |
| **Enqueue** | `enqueueResearchAgentTestProposal(approvals)` → `addCommandApproval(card)` |
| **Proposal** | Docs-only QA note: `docs/research-agent-approval-test.md` |
| **Gate** | `APPROVAL_GATES.research[0]` — “New tool or stack adoption” (structural only; no Research gate describes docs-only QA) |
| **Card source** | `research_agent` |
| **Approvals title** | **Research: New tool or stack adoption** |
| **Agents lane** | **Research Agent**, `live` badge, same awaiting-approval note as Build |
| **Duplicate guard** | Stable ID `RESEARCH_AGENT_TEST_PROPOSAL_ID`; block while **pending** |
| **QA-only wording** | Summary, checklist, requested action, alternatives, and Monitor panel intro state **QA test only — not a real tool adoption** (or vendor decision) |

**Disambiguation:** Seeded example **Research: Vendor selection or contract decision**
(Resend/Postmark) is a different card. The runtime test card mentions
`research-agent-approval-test.md` and QA-only language.

## Research Agent loop — real incident signal

Validated end-to-end path using **real** data (an active incident from the current
mock/live data set), not a QA fixture — the first path to exercise `AgentPacket` /
`chiefLog` end to end. Distinct from the QA-fixture Research loop above.

| Item | Current behavior |
|------|------------------|
| **Trigger** | **Monitor** page → panel **Research packet: active incident** → **Propose Research packet** (only shown when a Sev ≤2 active incident exists) |
| **Factory** | `src/components/chief/researchIncidentProposal.ts` (`buildResearchIncidentRequest`, `proposeResearchIncidentPacket`) |
| **Packet** | Wraps the request via `createAgentPacket("research", request)` (`agentPacket.ts`) before card creation — logs `packet_created` |
| **Enqueue** | `proposeResearchIncidentPacket(incident, approvals)` → `addCommandApproval(card)`, called from `MonitorPage.tsx` |
| **Proposal** | Real: summary, risk level, and checklist are derived from the incident's actual severity/status/service and a live comparison of two monitoring options — not seeded or QA copy |
| **Gate** | `APPROVAL_GATES.research[0]` — “New tool or stack adoption” (same structural gate as the QA loop; this occurrence is a genuine recommendation, not a fixture) |
| **Card source** | `research_agent` |
| **Approvals title** | **Research: New tool or stack adoption** (disambiguate by summary text — it names the real incident, e.g. “Auth p99 latency spike”) |
| **Agents lane** | **Research Agent**, same awaiting-approval mapping as the QA loop — no separate wiring needed |
| **Duplicate guard** | Stable ID keyed to the incident (`stableChiefId("apr-research-incident", incident.id)`); block while a proposal for that incident is **pending** |
| **Observability** | `packet_created` → `card_created` (both logged from `researchIncidentProposal.ts`, not from the shared `createApprovalCardFromResearchRequest` factory, to avoid logging the QA loop's/seeded example's card too) → `card_decided` (logged from `ChiefApprovalsContext.tsx`'s `recordDecision`) — visible on the operator-facing Recent Activity strip (`RecentActivityStrip.tsx`, on the Chief situation brief) and, in dev builds only, the Chief → Dev tab's Governance Events panel |

**Disambiguation:** Both this loop and the QA-fixture Research loop above produce cards
titled **Research: New tool or stack adoption**. Tell them apart by summary content:
this one names a real incident and service; the QA loop's summary references
`research-agent-approval-test.md` and states QA-only intent.

## Urgency and escalation signals

Pending approvals carry aging signals in two complementary places:

**Per-card urgency** (`chiefApprovalUrgency.ts`):

| Age (pending) | Badge | Escalate flag |
|---------------|-------|---------------|
| &lt; 24h | none (recent) | no |
| ≥ 24h | **Due soon** | no |
| &gt; 48h | **Overdue** | yes |

Used on Chief → Approvals cards and Chief → Agents awaiting-approval cards. Pending
list sorts stale-first (`compareApprovalsByAge`).

**Agents awaiting lane note:** When overdue pending proposals exist, the lane shows a
note such as “N of M awaiting operator decisions are overdue — review on the
Approvals tab.” Fresh runtime test proposals do not trigger this until they age past
48h (seeded cards may already be overdue).

**Approvals status strip** (`approvalStatus.ts`): Pending metric can show an **N stale**
badge (pending &gt; 24h). Footnote: “Stale = pending more than 24 hours.” This is
separate from per-card Due soon / Overdue badges but uses the same 24h threshold.

## Known limitations

Record these when testing or extending agent approval paths. Treat them as
constraints, not bugs.

1. **Decision-only behavior**
   - Approve / Reject / Send back records the operator decision.
   - No doc file is created.
   - No Build or Research agent job runs.
   - No workflow advances automatically from a decision.

2. **Stable-ID re-propose**
   - Test proposals use stable IDs (`stableChiefId`).
   - After a decision, `approvalDecisions` keeps that outcome.
   - Re-triggering the same test while the decision is still in memory does not produce
     a fresh pending card — the decision overlay wins.
   - In mock mode, a full page refresh clears in-memory decisions. Decisions survive
     reload only when live API hydration applies.
   - Practical impact: re-testing with the same stable ID requires clearing decisions or
     using a fresh ID.

3. **Duplicate guard is pending-only**
   - A second trigger while `status === "pending"` is blocked.
   - After decision, enqueue may succeed but the card can still show as decided (due to
     limitation 2).
   - Practical impact: duplicate prevention only applies during the pending window.

4. **Session-scoped proposal bodies**
   - Runtime cards from `addCommandApproval` are not written to the database.
   - Only decisions persist in live mode.
   - Practical impact: there is no historical archive of proposal bodies; treat them as
     ephemeral UI state.

5. **Research gate label vs intent**
   - The Research test uses `APPROVAL_GATES.research[0]` for card structure (“New tool
     or stack adoption”).
   - Copy must carry QA-only intent so operators do not treat it as a real
     stack-adoption or vendor decision.
   - Practical impact: any new QA-only Research paths must clearly state that they are
     tests, not production stack decisions.

## Rules for agents and tools

When adding or testing an agent approval path, treat this section as required system
law.

**Must-do:**

1. **Read this doc first**
   - Follow the shared approval path and limitations above.
   - Align new work with System law: Chief-only, human-in-the-loop, decision-only.

2. **Use the shared path for every approval**
   - Build a typed `*ApprovalRequest`.
   - Use `createApprovalCardFrom*Request()`.
   - Enqueue via `addCommandApproval()` (or the established seed/command patterns).
   - Do not invent new queues or backend tables for approvals.

3. **Block while pending**
   - Use a stable proposal ID (`stableChiefId`).
   - Guard duplicate enqueue while `status === "pending"`.

4. **Disambiguate cards**
   - Seeded examples and runtime tests may share gate titles.
   - Summaries must make the operator’s target obvious (e.g. reference docs-only QA
     files like `build-agent-approval-test.md` or `research-agent-approval-test.md`).

5. **Cite this doc in PR summaries**
   - For approval-loop or Chief Agents work, reference `docs/AGENT_APPROVAL_LOOPS.md`.
   - Example: “Updates Build/Research approval paths per docs/AGENT_APPROVAL_LOOPS.md.”

**Must-not:**

1. **Never bypass Chief**
   - Do not ask the operator for decisions directly in chat or UI (“please approve
     this”).
   - Do not create side-channel approvals outside Chief → Approvals.

2. **Never imply auto-execute**
   - Proposal copy and PR text must not claim that approval merges code, ships docs,
     or runs agent work.
   - Approvals record decisions only; downstream actions are separate workflows.

3. **Do not create alternate approval queues**
   - All approvals must flow through `ChiefApprovalsContext` via `addCommandApproval()`.
   - Do not add new tables or contexts to hold “shadow” approvals.

4. **QA test proposals must say QA-only**
   - Summaries, checklists, requested actions, and panel intros must state QA-only
     intent.
   - Research already does this; mirror the pattern for any new agent test slice.

## Planner Agent loop — live overdue re-sequencing

Two of three Planner gates are live. One remains unwired.

| Item | Current behavior |
|------|------------------|
| **Live gate** | `APPROVAL_GATES.planner[2]` — “Roadmap reprioritization or re-sequencing” |
| **Trigger** | **Operations** → panel **Planner re-sequencing signal** → **Check overdue work** |
| **Source of truth** | `ChiefLiveContext.overdueTasks` only (open tasks past `dueAt`) |
| **Factory** | `src/components/chief/plannerReprioritizationProposal.ts` |
| **Enqueue** | `proposePlannerReprioritization(liveContext, approvals)` → `addCommandApproval(card)` |
| **Card source** | `planner_agent` |
| **Duplicate guard** | Stable id `PLANNER_REPRIORITIZATION_PROPOSAL_ID`; block while **pending** |

## Planner Agent loop — live scope-change signal

| Item | Current behavior |
|------|------------------|
| **Live gate** | `APPROVAL_GATES.planner[0]` — “Scope change affecting more than one phase” |
| **Trigger** | **Operations** → panel **Planner scope-change signal** → **Check scope changes** |
| **Source of truth** | `ChiefLiveContext.blockingTasks` only (open tasks with an open required gate or an external blocker); a task's `workflowType` stands in for its phase, the same convention the re-sequencing gate uses for `affectedPhases` |
| **Signal condition** | Fires only when blocking tasks span **two or more** distinct workflow types at once |
| **Factory** | `src/components/chief/plannerScopeChangeProposal.ts` |
| **Enqueue** | `proposePlannerScopeChange(liveContext, approvals)` → `addCommandApproval(card)` |
| **Card source** | `planner_agent` |
| **Duplicate guard** | Stable id `PLANNER_SCOPE_CHANGE_PROPOSAL_ID`; block while **pending** |

**Unwired Planner gate:** “New roadmap phase” — no live signal wired yet.

**Reserved:** Research, Content, and Reliability producers are unchanged by this slice.

## Code map (reference only)

| Area | Location |
|------|----------|
| Request types + card helpers + `APPROVAL_GATES` | `src/components/chief/agentApprovalGates.ts` |
| Shared queue, `addCommandApproval`, `recordDecision` | `src/components/chief/ChiefApprovalsContext.tsx` |
| Build runtime test factory | `src/components/chief/buildAgentTestProposal.ts` |
| Research runtime test factory | `src/components/chief/researchAgentTestProposal.ts` |
| Research real-incident factory | `src/components/chief/researchIncidentProposal.ts` |
| Planner live overdue re-sequencing | `src/components/chief/plannerReprioritizationProposal.ts` |
| Planner live scope-change signal | `src/components/chief/plannerScopeChangeProposal.ts` |
| Packet envelope + logging | `src/components/chief/agentPacket.ts`, `chiefLog.ts`, `chiefGovernanceEvents.ts` |
| Build trigger UI | `src/pages/BuildsPage.tsx` |
| Research trigger UI | `src/pages/MonitorPage.tsx` |
| Planner re-sequencing / scope-change trigger UI | `src/pages/OperationsPage.tsx` |
| Approvals tab UI | `src/components/chief/ApprovalBoard.tsx`, `ChiefPanel.tsx` |
| Agents awaiting lane | `src/components/chief/AgentWorkBoard.tsx`, `deriveAgentAwaitingApprovalWorkItems()` |
| Per-card urgency | `src/components/chief/chiefApprovalUrgency.ts` |
| Stale pending metric | `src/components/chief/approvalStatus.ts` |
| Decision API (live mode) | `api/chief/approvals/index.ts` |

## Related docs

- [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) — agent vs approver roles, PR process, Chief-only routing
- [PR_SUMMARY_TEMPLATE.md](PR_SUMMARY_TEMPLATE.md) — PR description template
- `src/components/chief/agentApprovalGates.ts` (file header) — operating rule for agent approval requests
