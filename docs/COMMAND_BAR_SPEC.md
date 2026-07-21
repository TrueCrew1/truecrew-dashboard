# Global command bar — implementation note

## Where it lives

- `src/components/layout/CommandBar.tsx` — the UI: input, debounce, grouped
  dropdown, keyboard nav (arrows/Enter/Escape), ⌘K/Ctrl+K focus shortcut,
  recent searches (localStorage), loading/empty/no-results/error states,
  inline feedback banner after an action runs. Rendered inside
  `TopBar.tsx`, replacing the old dead `<input>` that never had a handler.
- `src/lib/search/` — the search/command domain, framework-agnostic (no
  React imports except where noted):
  - `types.ts` — `SearchResultItem` (`EntitySearchResult | ActionSearchResult`),
    `SearchResultGroup`, `SearchActionKind`, `SearchStatus`.
  - `searchService.ts` — `searchEntities()` aggregates and ranks results
    from real app state into the Agents / Projects / Tasks / Documents &
    notes groups, plus `searchContinueWork()` for "continue previous work
    on X".
  - `intentParser.ts` — `buildSuggestedActions()`, a deterministic
    regex-based parser turning free text into `Suggested actions`.
  - `actionRouter.ts` — `runSearchAction()`, the single place a
    `SearchActionKind` becomes a real navigation / Chief-tab switch /
    Chief command run.
  - `useCommandBarSearch.ts` — the debounced state machine
    (`idle → loading → success | empty | error`) CommandBar renders.
  - `searchLog.ts` — observability, described below.
- `src/components/chief/chiefCommandRunner.ts` — `runChiefCommand()`,
  extracted from `ChiefPanel.handleSubmit` so the command bar and Chief's
  own input box run the exact same resolve → classify → history/approval
  pipeline instead of two copies of it.
- `src/components/chief/ChiefUIContext.tsx` — new, small context so the
  command bar (in TopBar) can ask Chief's side panel to switch tabs
  (`requestChiefTab`) and filter the Agents board (`agentFilter`),
  without lifting Chief's rendering state out of `ChiefPanel.tsx`.

## How search results are modeled

Every result is one of two kinds (`src/lib/search/types.ts`):

- **`EntitySearchResult`** — a real task, workflow ("project"), agent, or
  document, with an in-app `route` and (for tasks/workflows) an
  `entityId` that opens the existing Context Rail. No separate
  "SearchResponse" envelope — `searchEntities()` returns
  `SearchResultGroup[]` directly, since the UI never needs anything else
  from it.
- **`ActionSearchResult`** — a suggested action with a `SearchActionKind`:
  `navigate`, `open_chief_tab`, or `run_chief_command` (with an explicit
  `target: "chief" | "ecosystem"`). This is the closed union that plays
  the role this task's spec calls `CommandIntent`/`CommandAction` — kept
  as one small discriminated union rather than three separate types
  because every action CommandBar can invoke fits one of these three
  shapes, and the exhaustiveness check in `actionRouter.ts` means a new
  action type can't be forgotten in the dispatcher.

Ranking (`scoreMatch` in `searchService.ts`) is deterministic: exact
match > prefix > substring > "every query word appears somewhere in the
field, in any order" (so "rate limiter billing" still finds "Billing API
rate limiter"). No fuzzy-matching library and no embeddings — the mock
data corpus is small enough that this is legible and sufficient, and it's
called out inline as the point to swap in a real search index or vector
search later.

## How Chief vs. ecosystem routing works

Both routes go through the same `runChiefCommand()` — there's no separate
"ecosystem executor." The only difference is which tab
`requestChiefTab()` reveals afterward:

- **`target: "chief"`** — Chief evaluates the command and the Command tab
  is shown, with Chief's own response/history.
- **`target: "ecosystem"`** — same resolution, but the Agents tab is
  shown instead, since that's where the specialist Chief routed to (via
  `ChiefResponse.routedTo`) actually shows up on the live Agent work
  board.

`assign X to chief` / `assign X to ecosystem` (from `intentParser.ts`)
and the ecosystem branch of `start research on X` both funnel through
this one path. "Show agents working on X" is a separate, lighter route:
it doesn't run a command at all, just opens the Agents tab pre-filtered
(`ChiefUIContext.agentFilter`, consumed by `AgentWorkBoard.tsx`) to items
whose agent/task/note text matches X.

## What's real vs. mocked

**Real, wired to actual app state — nothing fabricated:**
- All four search groups query the same `MockData`/`ChiefLiveContext`
  every other Chief surface reads (`data.tasks`, `data.workflows`,
  `data.notes/runbooks/prompts`, and the same `derive*AgentWorkItems`
  functions `AgentWorkBoard.tsx` uses). Swap `DataContext`'s mock source
  for the live Supabase source and the command bar's results follow
  automatically — no separate adapter to update.
- Selecting a task/project result navigates via the same
  `routeForTask`/`routeForWorkflowType` helpers (`chiefRoutes.ts`) the
  rest of the app uses, and opens the real Context Rail
  (`SelectionContext` + the same `EntityRailContent` every page's
  row-click already renders).
- `run_chief_command` actions call the real `resolveChiefCommand()` /
  `classifyChiefEvaluation()` pipeline and land in the real shared
  history/approvals queue (`ChiefApprovalsContext`) — a command run from
  the search bar shows up in Chief's History tab exactly like one typed
  into Chief's own input box.
- "Continue previous work on X" (`searchContinueWork`) is a real lookup
  against tasks in an active stage (In Progress / Waiting / Review),
  ranked by match then recency — not a stub returning canned data.
- Observability is real: `searchLog.ts` emits `search_query`,
  `search_action_routed`, and `search_error` events onto the existing
  `chiefGovernanceEvents` bus (the same one `chiefLog.ts` uses for
  packets/cards). Two side effects come for free from reusing it rather
  than inventing a parallel logger: search activity now shows in the
  dev-only Governance Events tab (`GovernanceEventsPanel.tsx`), **and** in
  the "Recent activity" strip on Chief's own Situation Brief
  (`RecentActivityStrip.tsx`), since that component already subscribes to
  every event on the bus.

**Deliberately not built, called out explicitly rather than faked:**
- **Query interpretation is regex-based, not an LLM.** `intentParser.ts`
  says so in its own header comment — it's the named swap point for real
  NLP/LLM intent parsing later, and every function it calls
  (`searchEntities`, `runSearchAction`) is agnostic to how the query got
  parsed. The repo's `src/llm/*` clients are server-side router clients
  for `/api` routes; wiring one in from browser code would mean adding a
  new serverless endpoint, which is out of scope for this pass and listed
  as the next step below.
- **"Create task" has no write path, and this doesn't fake one.** There
  is no task-creation primitive anywhere in the app today — the
  pre-existing `+ Quick create` button in TopBar has never had a handler.
  Rather than invent a fake local-only "task," `create task: X` / `new
  task: X` routes to Chief for triage (same advisory-only path as every
  other command) and the suggested action's own subtitle says so. Adding
  real persistence is a separate, larger change (new Task record shape +
  API route + Supabase migration) that this PR intentionally doesn't take
  on.
- **"Open roadmap" has no dedicated page.** There's no Roadmap
  entity/route in this app; "roadmap"-shaped queries route to `/knowledge`
  (documented inline in `intentParser.ts`) since that's where Roadmap
  Agent's actual output (notes/runbooks) would surface via the existing
  Librarian search in `resolveChiefCommand`.

## What should be wired next

- A real `/api/search` (or similar) endpoint plus a genuine LLM-based
  intent classifier, swapped in behind `intentParser.ts`'s existing
  interface — no caller changes needed.
- A real task-creation primitive (Task record + write API), once that
  exists elsewhere in the app, so `create task: X` can create instead of
  only routing to Chief.
- Wiring "Continue previous work" and "Show agents working on X" against
  incidents and workflows too, not just tasks, once there's a concrete
  use case for it (kept scoped to tasks for now to match the given
  examples).
