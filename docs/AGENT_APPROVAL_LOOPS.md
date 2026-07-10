# Agent approval loops (Build + Research)

Durable reference for how Build and Research agent proposals enter Chief's approval
queue today. Describes the system as it exists — not a roadmap.

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

## Chief command-surface loop

Validated end-to-end path from typed operator commands (not an agent trigger,
but the same shared queue).

| Item | Current behavior |
|------|------------------|
| **Trigger** | Chief → **Command** tab — free-text input, submitted via the command form |
| **Classifier** | `resolveChiefCommand()` in `chiefLiveContext.ts` — keyword match against live ops data (blocked/gates, missing context, incidents, alerts, approvals, risk, knowledge) |
| **Card builder** | `buildApprovalFromResponse()` in `chiefMock.ts` — only runs when the matched resolver sets `ChiefResponse.approvalNeeded: true` (today: blocked/gates, missing context, incidents needing repair, alerts) |
| **Enqueue** | `addCommandApproval(card)` — same call every other source uses |
| **Card attribution** | No `source` is set on command-originated cards; `specialist` is set from `response.routedTo` (or the first `specialists` entry). `resolveAgentForAwaitingApproval()` in `chiefLiveContext.ts` already falls back to `specialist` when `source` is absent — this is documented, intentional behavior (see that function's comment), not a gap. Command-originated cards therefore surface correctly in Chief → Agents → Awaiting when routed to an agent specialist (e.g. Workflow Gate Agent, Research Agent, Librarian Agent). |
| **Logging** | `addCommandApproval()` unconditionally emits `approval_proposal_created` (`chiefGovernanceEvents.ts`) — command-originated cards are logged the same as every other source, no separate wiring needed |

**Same shared queue:** command-generated proposals merge into the exact
`ChiefApprovalsContext` queue as runtime QA triggers, seeded examples, and live
ops derivations. There is no separate command-approval queue, and none should
be added — see System law above.

**Handoff contract for future Research/Builder proposals:** the required path
for any future Research or Builder agent output that needs an operator
decision is the same typed-request pattern already defined in
`src/components/chief/agentApprovalGates.ts`:

```
<agent> builds its typed *ApprovalRequest object
  (PlannerApprovalRequest / BuildApprovalRequest /
   ResearchApprovalRequest / ContentApprovalRequest)
  → createApprovalCardFrom*Request()
  → addCommandApproval()
  → shared approvals queue (same queue as the command surface above)
```

This is not a new contract to design — it is the existing pattern Build and
Research already use for their validated QA loops above. Any future
Research/Builder integration should populate one of these typed request
objects (or add a new `*ApprovalRequest` following the same shape, with a
matching `createApprovalCardFrom*Request()` and an `ApprovalSource` entry)
rather than inventing a new packet shape or a new queue.

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

## Code map (reference only)

| Area | Location |
|------|----------|
| Request types + card helpers + `APPROVAL_GATES` | `src/components/chief/agentApprovalGates.ts` |
| Shared queue, `addCommandApproval`, `recordDecision` | `src/components/chief/ChiefApprovalsContext.tsx` |
| Build runtime test factory | `src/components/chief/buildAgentTestProposal.ts` |
| Research runtime test factory | `src/components/chief/researchAgentTestProposal.ts` |
| Build trigger UI | `src/pages/BuildsPage.tsx` |
| Research trigger UI | `src/pages/MonitorPage.tsx` |
| Approvals tab UI | `src/components/chief/ApprovalBoard.tsx`, `ChiefPanel.tsx` |
| Agents awaiting lane | `src/components/chief/AgentWorkBoard.tsx`, `deriveAgentAwaitingApprovalWorkItems()` |
| Per-card urgency | `src/components/chief/chiefApprovalUrgency.ts` |
| Stale pending metric | `src/components/chief/approvalStatus.ts` |
| Decision API (live mode) | `api/chief/approvals/index.ts` |

## Related docs

- [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) — authoritative agent laws, Chief foreman role, roster, session prompts
- [EXECUTION_KIT.md](EXECUTION_KIT.md) — start-here entry point summarizing this doc plus lane routing
- [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) — agent vs approver roles, PR process, Chief-only routing
- [PR_SUMMARY_TEMPLATE.md](PR_SUMMARY_TEMPLATE.md) — PR description template
- `src/components/chief/agentApprovalGates.ts` (file header) — operating rule for agent approval requests
