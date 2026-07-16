# Chief Operating System

"Chief" means two related but distinct things in this codebase, and this doc exists
to keep them from getting conflated:

1. **Chief the product feature** — the in-app command center inside True Crew itself
   (`src/components/chief/*`), surfaced to True Crew's own operator/supervisor users.
2. **Chief the repo governance role** — the approvals router in this repo's own
   agent-development process (`docs/AGENT_RUNBOOK.md` § Chief), the thing that turns
   Planner/Build/Research/Content's requests into decisions for David.

Both share the same underlying idea — **filter and summarize before asking a human
to decide** — but they are separate implementations for separate audiences. Neither
one does AI-model routing/dispatch; see § "What Chief is not" below.

## 1. Chief the product feature

Chief is one of True Crew's own app surfaces (Today → Operations → Builds/Repair →
Monitor → Customers → Review, per `README.md`) — a command center that gives a
supervisor a filtered, prioritized view instead of raw noise.

**Core pieces, grounded in the actual code:**

- **Decision tiers** (`src/components/chief/chiefDecisionTier.ts`) — a deterministic,
  rules-first classifier with no AI involved (explicitly, by design, per the file's
  own comment). Given `riskLevel`, `reversible`, `externalFacing`, and
  `affectsProduction`, it returns one of three tiers:
  - `approve` — high risk, irreversible, external-facing, or production-affecting;
    always builds a structured `ChiefApprovalPacket` (recommendation, rationale,
    evidence, next action).
  - `notify` — medium risk, none of the above forcing flags.
  - `decide` — low risk, reversible, internal; safe for the specialist to just do it.
  - Precedence is fixed: rule 1 always wins over rule 2, which always wins over
    rule 3 — this is the mechanism that keeps Chief from downgrading something that
    should have been escalated.
- **Command routing** (`src/components/chief/chiefLiveContext.ts`,
  `resolveChiefCommand`) — the deterministic router that turns a live command/state
  into a `ChiefResponse`, distinct from the decision-tier classifier above and from
  `chiefAiFallback.ts` (referenced in `chiefDecisionTier.ts`'s own comments as a
  planned AI-assisted fallback path — **that file does not exist in this repo
  today**; treat it as a named extension point, not a shipped capability).
- **Specialist vocabulary** (`src/components/chief/types.ts`,
  `ChiefSpecialist`) — in-app work gets attributed to one of: **Workflow Gate
  Agent, Librarian Agent, Research Agent, Roadmap Agent, Marketer Agent, Build
  Agent** (agent-work board only), or **Chief** itself
  (`ChiefResponse.routedTo`). This is product-domain vocabulary describing True
  Crew's own operator workflow — it is a different vocabulary from this repo's own
  meta-level dev-process agents (§ 2) and should not be conflated with them, even
  where names look similar ("Research Agent" here is an in-app work attribution
  label, not `docs/AGENT_RUNBOOK.md`'s Research agent).
- **In-app navigation routing** (`src/components/chief/chiefRoutes.ts`) —
  `routeForWorkflowType`/`routeForTask`/`routeForEntityRef` map a task or workflow
  type to a dashboard route (`/builds`, `/operations`, `/monitor`, etc.). This is
  page navigation, not tool/model routing — worth naming explicitly since "Chief
  routes X" can otherwise be misread as an AI-dispatch claim.
- **Approval urgency** (`chiefApprovalUrgency.ts`) — sorts/badges pending approvals
  by age so the oldest or most time-sensitive surfaces first.
- **Governance events** (`chiefGovernanceEvents.ts`) — the audit trail: Approve/Send
  back/Reject actions update in-memory card state and the audit log only. No card
  action auto-merges, auto-deploys, or auto-messages externally — that's a
  documented extension point, not current behavior, matching the same rule stated
  for the repo-governance role in § 2.

### Routing example (product feature)

A build-gate check fails on a PR. `resolveChiefCommand` produces a `ChiefResponse`
with `routedTo: "Workflow Gate Agent"`. `chiefDecisionTier`'s classifier sees
`affectsProduction: true` → tier `approve`, builds a `ChiefApprovalPacket`
("Hold — review before proceeding," with the failing check as `evidence`). The
Chief Approvals panel renders this as a card; the operator sees Approve / Send back
/ Reject with the recommendation already visible — they never see a raw gate-failure
log.

## 2. Chief the repo governance role

**Purpose (per `docs/AGENT_RUNBOOK.md` § Chief):** approvals router and summarizer —
the only path from any agent's request to David's decision, for the actual work of
building True Crew.

**Responsibilities:**
- Convert every agent approval request (`PlannerApprovalRequest`,
  `BuildApprovalRequest`, `ResearchApprovalRequest`, `ContentApprovalRequest` — see
  `src/components/chief/agentApprovalGates.ts`) into an `ApprovalCard` via the
  matching `createApprovalCardFrom*Request()` helper.
- Ensure the checklist (tests, risks, files, summary) is actually populated, not a
  placeholder.
- Present only a clear decision to David — Approve / Send back / Reject, with the
  recommendation up front.
- Filter, bundle, and prioritize before a card ever appears (§ Approval Load in
  `docs/AGENT_RUNBOOK.md`) — the job is to reduce how many decisions David has to
  make, not route every request through indiscriminately.
- Log outcomes in the Obsidian Build Log / Agent Log.

**What Chief checks before recommending anything:**
- Verifies the agent's claims (CI status, build output, docs) rather than trusting
  `testsOrChecksDone` at face value when it's independently checkable.
- Looks for a stated precondition the agent didn't resolve — if unresolved, the
  recommendation is **Hold**, not Approve, regardless of risk level.
- Confirms the request doesn't duplicate or contradict something already shipped or
  decided (checks the Build Log first).
- Checks whether the request touches a topic already covered in
  `knowledge/decisions/` or `knowledge/concepts/` and links it if so.
- **Reliability-aware:** if the request depended on a tool `docs/TOOL_CATALOG.md`
  marks `DEGRADED`/`BLOCKED`, confirms the agent used the documented fallback (see
  `knowledge/reference/tool-fallbacks.md`) or disclosed the degradation.

**Rules — never bypasses approval or review gates:**
- Never bypasses or dilutes an approval gate — every action on each agent's
  "Requires Chief approval" list gets a card, no exceptions for expediency.
- Never auto-merges, auto-deploys, or auto-messages externally from a card action.
  Approve/Send back/Reject only ever update in-memory card state and the audit log.
- Change control applies to Chief's own rulebook too: a change to
  `docs/AGENT_RUNBOOK.md` that loosens or tightens a gate goes through a Build
  approval request first, before it takes effect.

### Routing example (repo governance)

Build finishes a migration and states `testsOrChecksDone: true`. Chief independently
checks CI status rather than trusting the flag, confirms no open precondition, checks
`knowledge/decisions/` for a conflicting prior call, and only then builds the
`ApprovalCard` with a recommended **Approve** — David still makes the actual call.
If CI were red, Chief's recommendation would be **Hold**, regardless of what Build
claimed.

### Tool-choice example (policy, not code)

When an agent needs to decide *which AI tool* to use for a sub-task (e.g., "does
this need live pricing research, or can Claude Fable answer it directly?"), that
decision is made against `docs/agents/AI_TOOL_OPERATING_GUIDE.md`'s routing matrix
by the agent or David — **Chief does not execute this choice in code.** Example: a
Research request that needs current competitor pricing routes to Perplexity Pro per
the operating guide, not to Claude Fable directly, because that's a live-web
question Claude Fable can't answer from the repo alone. Chief's role in that flow is
still only to gate the *outcome* (e.g., a `ResearchApprovalRequest` if the finding
changes something decision-worthy) — not to have picked the tool.

## What Chief is not

- **Not a model router or AI dispatcher.** There is no code in this repo (product or
  governance) that has Chief programmatically call out to GPT-5-mini, Kimi,
  DeepSeek, or any other model. `chiefDecisionTier.ts` is explicit that its own
  classification is rules-first with "no AI involved here on purpose."
  `chiefAiFallback.ts` is referenced in a comment as a future extension point and
  does not exist as a file today — don't describe it as shipped.
- **Not a code editor.** Chief (either role) never directly edits code. Claude Fable
  is the only lane that authors repo changes; Chief only routes the approval
  decision around that change.
- **Not a bypass path.** Neither role has an "skip review" mode. Every irreversible,
  external-facing, or production-affecting action gets a card — see § Incidents,
  Pauses, and Escalation in `docs/AGENT_RUNBOOK.md` for what happens when an agent
  can't clear that bar on its own.

## Related docs

- `docs/AGENT_RUNBOOK.md` § Chief — full operating contract (this doc summarizes and
  cross-links it; the runbook is the source of truth for the governance role).
- `docs/AGENT_WORKFLOW.md` — the Agent ↔ Approver workflow Chief sits inside.
- `docs/agents/AI_TOOL_OPERATING_GUIDE.md` — which tool/model to reach for, and how
  its output gets back into this same approval path.
- `src/components/chief/types.ts` — the actual `ChiefResponse`, `ChiefSpecialist`,
  `ApprovalProposal`, and `ChiefApprovalPacket` shapes referenced above.
