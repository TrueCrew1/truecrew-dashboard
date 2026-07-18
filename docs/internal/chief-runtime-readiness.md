# Chief & Approvals Runtime Readiness Map

Internal reference for what's actually real in Chief's runtime today, cited
from code — not aspirational. Written to be checked before any future work
that widens Chief's autonomy. This is a snapshot classification, not a new
governance doc: for the *rules* (approval gates, verification standard,
readiness checklist), see `docs/AGENT_RUNBOOK.md` and
`docs/agents/CHIEF_OPERATING_SYSTEM.md` — this file only maps *runtime
reality* against those rules' five key capability slices.

## Runtime truth, in short

Chief's data layer is a real, end-to-end Supabase pipeline
(`GET /api/data`, `GET /api/tasks`, `GET/POST /api/chief/approvals`) that a
client-side `DataContext` consumes — but it only activates when
`VITE_USE_LIVE_API=true` and Supabase is configured; otherwise everything
renders from `src/data/mockData.ts` (`DataContext`'s own default state).
Approval **decisions** (approve/reject/send-back) are genuinely live via
Supabase once that flag is on. Approval **proposals** are a deliberate mix:
some are derived live from real task/incident/customer data, some are
permanently-illustrative demo cards by design (not a gap — see
`chiefApprovalCardMocks.ts`'s own header). Chief's AI-generated advisory
text (`POST /api/chief/ask`) is real, working code, but off by default and
narrowly scoped to the *no-deterministic-match* fallback case — it is not a
general "next best action" engine.

## Capability map

| Capability | Primary source | Status | What would move it toward Live |
|---|---|---|---|
| Priorities surfaced to Chief | `DataContext` → `fetchCommandCenterData()` → `GET /api/data` → `lib/supabase/queries.ts` (`fetchRawCommandCenterRows`), with `mockData.ts` as the default/fallback state | **Partially wired** | Set `VITE_USE_LIVE_API=true` and configure Supabase in the target environment — the code path is already real end-to-end; today's default is mock because the flag is off, not because wiring is missing. |
| Approvals needing attention | `GET/POST /api/chief/approvals` → `lib/supabase/queries.ts` (real, Supabase-backed decisions); proposal *content* merges live-derived candidates with intentionally-permanent demo cards (`chiefApprovalCardMocks.ts`, `agentApprovalGates.ts`) | **Partially wired** | Decision persistence is already Live. The remaining gap is proposal *sourcing*: the PR-pattern demo cards have a documented extension point (a real GitHub PRs API client) that isn't built yet — would need a new external integration, out of scope for a small slice. |
| Agent/work status | Build, Workflow Gate, Research, Librarian, and Awaiting-approval lanes derive from real `data.tasks`/`data.incidents`/`data.notes`/live approvals; two agent rows (Roadmap Agent, Marketer Agent) are static illustrative entries with no backing system | **Partially wired** | The two mock rows have no real system behind them yet (no live Roadmap or Marketer agent exists) — closing this gap means building those agents first, not a wiring fix. |
| Recent activity / situation brief | Situation-brief metrics reuse the same live-context pipeline as Priorities (real once the live-API flag is on); the separate "recent activity" governance-event feed (ADR-001) is real data but client-session-only (in-memory + `localStorage`), never server-persisted | **Partially wired** | Situation-brief metrics track Priorities' status above. The governance-event feed specifically would need server-side persistence (a new table/route) to survive reload or be visible across devices — a real, scoped, but non-trivial addition. |
| Next recommended actions | Two distinct mechanisms: (1) deterministic, rule-based `recommendedAction` text baked into every derived proposal — real, always present, not AI-generated; (2) `POST /api/chief/ask` → `lib/chief/modelRouter.ts` → Azure AI Foundry / Ollama — real code, but only fires when Chief's client-side deterministic router finds no match, and is off by default (`CHIEF_AI_FALLBACK_ENABLED=false`) | **Partially wired** | (1) is already Live as templated text — it isn't a recommendation *engine* and there's no code gap to close there, just a scope question. (2) would need the feature flag turned on (human-only, Vercel env config) to move from "wired but dormant" toward regularly Live. |

## Notes on classification

- **No capability here is "Mock-only" or "Missing."** Every one of the five
  has real, working code behind at least part of it — the gap is
  consistently *conditional activation* (an env flag, Supabase config) or
  *scope* (a demo card's real-data extension point not yet built), not
  absent wiring. That's a meaningfully different, cheaper gap to close than
  "build this from scratch."
- **"Partially wired" here does not mean fragile.** Every route cited above
  already has a real, typed client wrapper in `src/lib/api/client.ts` and a
  real internal-auth-gated Vercel handler in `api/`. The classification
  reflects *default local-dev state* and *deliberate scope boundaries*
  (illustrative demo cards, off-by-default AI fallback), not incomplete
  engineering.
- **Distinguish "off by default" from "not built."** `CHIEF_AI_FALLBACK_ENABLED`
  and `VITE_USE_LIVE_API` are feature flags on real, tested code paths — a
  human flipping a flag (not a code change) is often the entire gap for
  those two.

## Additional findings (later pass)

Two forward-path notes found in a follow-up inspection pass, additive to the
map above rather than changing its classifications:

- **Agent/work status:** an **open, unmerged** PR (#118,
  `build/planner-work-items-route`, per this repo's own branch audit) adds a
  `planner_work_items` Supabase migration and a `useAgentWorkData` hook —
  real work in flight toward replacing the two static illustrative rows
  (Roadmap Agent, Marketer Agent) noted above with live-backed ones. Worth
  checking that PR's status before building anything new for this row from
  scratch.
- **Recent activity / situation brief:** beyond the client-session-only
  governance-event feed already noted, there's a real **write-only** sink one
  layer further back: `api/github/webhook.ts` → `recordWebhookDelivery()`
  (`lib/supabase/admin.ts`) persists every GitHub webhook delivery
  (PR/gate events) to Supabase already — but no route in `api/**` reads that
  table back out for display. If a server-persisted activity feed is ever
  wanted, that data is already flowing in; only a read route is missing.

## Sources

- `api/data/index.ts`, `api/tasks/index.ts`, `api/tasks/[id].ts`,
  `api/chief/approvals/index.ts`, `api/chief/ask.ts` — inspected directly for
  this map.
- `src/lib/api/client.ts` — typed client wrappers for all routes above.
- `src/context/DataContext.tsx` — the mock/live/mock-fallback switch every
  capability above ultimately depends on.
- `lib/chief/modelRouter.ts` — the AI fallback's routing logic.
- `api/github/webhook.ts`, `lib/supabase/admin.ts` (`recordWebhookDelivery`) —
  the write-only activity sink noted in Additional findings above.
- Branch audit context for PR #118 (`build/planner-work-items-route`),
  open/unmerged as of the later pass noted above.
- `docs/agents/CHIEF_OPERATING_SYSTEM.md` §§ 1–3, `docs/AGENT_RUNBOOK.md` §
  Chief AI Fallback Routing — prior narrative documentation this map is
  consistent with, not a replacement for.
