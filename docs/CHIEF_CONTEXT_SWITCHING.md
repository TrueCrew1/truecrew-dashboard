# Chief context switching

Chief now has a real active-context model instead of only interpreting prompt
text. This doc explains where that state lives, how it changes what Chief
shows, and what's still stubbed.

## The problem this fixes

Chief's approval surface always showed the same parent/global cards — Billing
API deploy hold, Auth p99 latency spike, Q3 pricing model decision, roadmap
phase proposals, vendor selection, homepage copy — no matter what the
operator typed. That's because those cards come from three sources that were
never filtered by anything:

1. **`deriveApprovalCandidates(data, liveContext)`** in `chiefLiveContext.ts` —
   derives gate/incident/deploy/customer/focus/alert proposals from live or
   scoped project data. Offline **global** mode no longer surfaces cards from
   legacy `mockData.ts` SaaS placeholders (Billing API, Auth p99, etc.).
2. **Static demo/gate cards** — previously `chiefApprovalCardMocks.ts`,
   `repoChangeApprovals.ts`, and EXAMPLE_* seeds in `agentApprovalGates.ts`.
   Those static seeds are **removed**; global Approvals no longer shows them.
   M&S Painting still has its governed Research mission source
   (`msPaintingApprovals.ts`).
3. **`monitorApprovals`** — derived from live Vercel/Supabase platform health.

None of this had any concept of "which job is Chief working." A prompt can't
change what these functions are called with — they always ran against the
one global `data` object. Fixing it required a real data-flow change, not
better prompt matching.

## The context model

- **`src/components/chief/chiefContext.ts`** — defines `ChiefContextId`
  (`"global" | "ms-painting"`) and a small registry (`CHIEF_CONTEXTS`) with
  each context's label/description. Extension point for a third project.
- **`src/context/ChiefContextProvider.tsx`** — a React context holding
  `activeContext` as real state, persisted to `localStorage`
  (`truecrew.chief.activeContext`) so a switch survives a reload. Wraps
  `ChiefApprovalsProvider` in `AppShell.tsx`.
- **`src/components/chief/chiefContextScope.ts`** —
  `scopeDataToChiefContext(data, contextId)`. `"global"` is a passthrough.
  Any project context filters `tasks`/`workflows` down to records tagged
  with that `projectId`, then filters `customers`/`incidents`/`deploys`/
  `focusItems`/`alerts` down to only what those tasks/workflows reference.
  Knowledge sources (`runbooks`, `prompts`, `notes`) stay unscoped — they're
  a shared reference library, not project-owned work.

`Task` and `Workflow` (`src/types/index.ts`) gained an optional `projectId?:
string`. Absent = global/parent dashboard (existing records are untouched).

## How M&S Painting is wired in

M&S Painting isn't a card — it's a project with its own real seed data in
`src/data/mockData.ts`, all tagged `projectId: "ms-painting"`:

- Customer `cust-ms-painting` ("M&S Painting").
- Two tasks (`task-ms-001` — jobsite intake checklist build; `task-ms-002` —
  onboarding kickoff, blocked on a crew roster).
- One workflow (`wf-ms-001`) linking the build task.
- One focus item for the stalled onboarding.

`src/components/chief/msPaintingApprovals.ts` gives M&S Painting its own
approval source: a real governed Research mission
(`buildResearchProjectSummaryHandoffRequest`, the same helper any workflow
uses) wired to `wf-ms-001`. Approving it calls
`executeProjectSummaryHandoffMission` against that workflow — loads it (and
its linked tasks) from Supabase and runs the live Research LLM lane. It's not
a mock action; it's the same pattern the rest of Chief already uses for
research missions, just pointed at M&S Painting's own workflow instead of a
generic one.

Everything else M&S Painting shows in the approvals/board/agents surfaces —
gate overrides, onboarding-stall proposals, missing-context proposals — comes
from `deriveApprovalCandidates` running against the *scoped* data, exactly
the same derivation logic global uses. No separate M&S-specific rule set was
invented for that part; scoping the input was enough.

## How the switch actually changes Chief's output

`ChiefApprovalsContext.tsx` is the single place all of this comes together:

1. Reads `activeContext` from `useChiefContext()`.
2. Computes `chiefData = scopeDataToChiefContext(data, activeContext)` and
   feeds that (not the raw global `data`) into `buildChiefLiveContext` and
   `deriveApprovalCandidates`.
3. Picks the static approval-card source by context: global's demo/gate
   cards for `"global"`, `MS_PAINTING_APPROVAL_CARDS` for `"ms-painting"`.
   These are two different arrays now, not one array filtered after the
   fact.
4. Filters `monitorApprovals` (platform health) to `"global"` only —
   infrastructure health isn't a specific project's work.
5. Stamps every command-created proposal (`addCommandApproval`, fired when
   an operator's typed command produces an approval) with the context it was
   created in, and filters those by the current context on read.
6. Exposes the resulting `chiefData` on the context value so every other
   Chief surface (`ChiefPanel`, `ChiefHomePanel`, `AgentStatusStrip`,
   `AgentWorkBoard`, `useBuildTasks`) reads the same scoped data instead of
   calling `useData()` directly.

Command routing (`resolveChiefCommand`) and board-item derivation
(`deriveChiefBoardItems`) didn't need new per-context rules — they already
take `data`/`ctx`/`approvals` as arguments, so scoping the input scopes
their output too.

**Scope note:** this only changes Chief's own surfaces (the Chief panel, the
homepage Chief panel, and Chief's Agents/Board tabs). The main dashboard
pages (Operations, Builds, Monitor, Customers, etc.) are unaffected — Chief
operates inside a scoped job context without changing what the rest of the
app shows, matching "M&S Painting is its own job context, not another
dashboard card."

## Where you see it

- **Chief panel header** (`ChiefPanel.tsx`) and the **homepage Chief panel**
  (`ChiefHomePanel.tsx`) both render `ChiefContextSwitcher` — a labeled
  `<select>` showing "Global" or "M&S Painting," always visible, never just
  a tooltip. Switching it calls `setActiveContext` immediately.
- When a project context is active, `ChiefHomePanel` also shows a banner:
  *"Operating inside M&S Painting — parent/global approvals and tasks are
  hidden."*

## What's real vs. stubbed

**Real:**
- The context switch itself (persisted state, not a prompt).
- Data scoping (`scopeDataToChiefContext`) — a true filter on the input to
  every derivation function, not a post-hoc UI filter.
- M&S Painting's task/workflow/customer records.
- M&S Painting's Research mission approval — executes the same live mission
  runner any workflow uses.
- Derived gate/onboarding/context proposals for M&S Painting tasks (same
  logic as global, scoped input).

**Stubbed / extension points:**
- Only one project (`ms-painting`) exists today. Adding a second means: add
  its `ChiefContextId` + registry entry in `chiefContext.ts`, tag its
  tasks/workflow with a `projectId` in `mockData.ts` (or a live-data
  equivalent), and give it its own static approval source file if it needs
  one.
- Live Supabase-backed tasks/workflows don't have a `projectId` column yet —
  only the TS type supports it. A live record without `projectId` is treated
  as global. Wiring live data into a project context needs a matching
  `project_id` column/migration.
- Knowledge (runbooks/prompts/notes) is intentionally shared across
  contexts, not project-scoped — there was no existing per-project knowledge
  concept to hook into.
- M&S Painting has exactly one seeded build task and one onboarding task —
  enough to prove the source switch works end-to-end, not a full backlog.
