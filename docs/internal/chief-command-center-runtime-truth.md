# Chief Command Center Runtime Truth Map

Internal, code-backed reference for what's actually real behind Chief's
front-door surface today — written so Chief (the agent) and future tooling
route decisions on evidence, not assumption. For governance rules
(approval gates, verification standard), see `docs/AGENT_RUNBOOK.md` and
`docs/agents/CHIEF_OPERATING_SYSTEM.md` — this file only maps runtime
*reality* against that existing rulebook.

**Premise check — read this first.** This task was framed around a
described Cursor change: a new canonical `/chief/command-center` route
through `ChiefCommandCenterPage` → `ChiefCommandCenterView`, replacing an
older `src/components/chief/command-center/*` mock stack. That work is
**not present in this repo**: `ChiefCommandCenterPage` and
`ChiefCommandCenterView` return zero matches anywhere in `src/`, no route
registers `/chief/command-center`, and `git grep` across every local branch
tip (~140 branches) plus a full commit-message search found no trace of it,
on this branch or any other reachable one. Rather than assert a front door
that doesn't exist, this map documents the **actual current Chief front
door** — `ChiefPanel.tsx` / `ChiefHomePanel.tsx` and the context/API stack
underneath them — so it stays honest until that rename/de-wire actually
lands. If/when it does, this file's classifications should be re-verified
against the new component names, not assumed to carry over unchanged.

## Runtime truth, in short

Chief's own derivation layer (`chiefLiveContext.ts`) is pure, synchronous,
in-memory computation over whatever `data` it's handed — it has no fetch of
its own. That `data` comes from `DataContext`, which defaults to
`src/data/mockData.ts` and only pulls live Supabase data
(`GET /api/data`/`GET /api/tasks`) when `VITE_USE_LIVE_API=true`. Layered on
top: approval **decisions** are a genuine, independent, always-real async
round-trip to Supabase (`GET/POST /api/chief/approvals`) regardless of that
flag. Chief's AI-generated advisory text (`POST /api/chief/ask`) is real,
working, async code, gated off by default and scoped only to the
no-deterministic-match fallback case.

## Section truth map

| Section | Primary source | Classification | Smallest next step |
|---|---|---|---|
| Priorities | `chiefLiveContext.ts`'s `buildChiefLiveContext(data)` — pure synchronous derivation (overdue/blocking/focus/alert lists) over whatever `data` `DataContext` provides | **Derived only** | No code gap in the derivation itself. To make the *inputs* live, set `VITE_USE_LIVE_API=true` and configure Supabase — the derivation will compute over real rows automatically, no logic change needed. |
| Approvals needing attention | `GET/POST /api/chief/approvals` (real, Supabase-backed decisions) + `deriveApprovalCandidates(data, liveContext)` (derived proposals) + a documented, permanently-illustrative demo-card set | **Partially wired** | Decision persistence is already Live. The demo-card portion has a documented but unbuilt extension point (a real GitHub PRs API client) — out of scope for a small slice. |
| Agent & work status | Build/Workflow Gate/Research/Librarian lanes: derived synchronously from `data.tasks`/`data.incidents`/`data.notes`; Awaiting-approval lane: derived from the (partially-live) approvals queue; two agent rows (Roadmap Agent, Marketer Agent): static, no backing system | **Partially wired** | The two static rows have no real system to point to yet — closing that gap means building those agents, not rewiring existing code. |
| Recent activity / situation brief | Situation-brief metrics: same derived `chiefLiveContext` numbers as Priorities. Recent-activity feed: real, live-emitted client events (ADR-001, `chiefGovernanceEvents.ts`), buffered in-memory + `localStorage`, never sent to a server | **Partially wired** | The activity feed is real-time and accurate but not durable — surviving reload/cross-device visibility would need a new server-side events table + route, a real but non-trivial addition. |
| Next recommended actions | Deterministic `recommendedAction` template strings baked into each derived proposal (rule-based, not AI); separately, `POST /api/chief/ask` → `lib/chief/modelRouter.ts` → Azure AI Foundry/Ollama, real but off by default and scoped only to the generic-fallback case | **Partially wired** | The templated text has no code gap — it's a scope ceiling, not a bug. The AI path would move toward "more live" simply by a human flipping `CHIEF_AI_FALLBACK_ENABLED` (Vercel env config, no code change). |

## Evidence

- **Priorities**: `src/components/chief/chiefLiveContext.ts` — `buildChiefLiveContext(data: MockData): ChiefLiveContext` has no `await`, no fetch, no API import; it's a straight `.filter()`/`.map()` pass over its `data` argument.
- **Approvals**: `api/chief/approvals/index.ts` — real `GET`/`POST` handler calling `lib/supabase/queries.js`'s `fetchChiefApprovalDecisions`/`insertChiefApprovalDecision`, gated by `requireInternalAuth` and `isSupabaseConfigured()`. `src/components/chief/ChiefApprovalsContext.tsx` — calls this route via `fetchChiefApprovalDecisions()`/`recordChiefApprovalDecision()` from `src/lib/api/client.ts` only when `isLiveApiEnabled()`; falls back to a local `setTimeout` + in-memory decision otherwise. Its own header comment documents the proposal mix explicitly: seeded via `getSeedApprovalCards()` — demo PR cards, one real wired source (`repoChangeApprovals.ts`), and one example request per agent (`agentApprovalGates.ts`).
- **Agent & work status**: `chiefApprovalBoard.ts`'s own comment on `deriveBuildAgentWorkItems`: *"Real, not mock: derives Build's Agents-tab entries from the same live task data... no separate agent-status source exists."* `agentWorkBoardMock.ts`'s own comment: *"Mock only... Workflow Gate, Research, and Librarian entries are now derived from real data... other agents there still run on mock."*
- **Recent activity**: `chiefGovernanceEvents.ts`'s file header: *"Chief governance events — client tier of the auditor system (ADR-001)... They are not authorization signals: they do not approve, merge, deploy, or trigger agent work."* Events are stored via `saveSessionState`/`loadSessionState` (localStorage), not any API call.
- **Next recommended actions**: `api/chief/ask.ts` — `POST`-only, returns `503` if neither `isCloudFallbackEnabled()` nor `isOllamaFallbackEnabled()` is true; wraps `lib/chief/modelRouter.ts`'s `routeChiefFallback()`, whose own doc comment states it's *"Only ever called after resolveChiefCommand's deterministic router finds no specialist match."*

## Sources

- `src/components/chief/chiefLiveContext.ts`, `src/components/chief/ChiefApprovalsContext.tsx` — inspected directly, read-only, per this task's explicit allowance.
- `api/chief/approvals/index.ts`, `api/chief/ask.ts`, `api/data/index.ts`, `api/tasks/index.ts` — inspected directly (prior session pass, re-confirmed unchanged via `git log` on each).
- `src/lib/api/client.ts`, `src/context/DataContext.tsx`, `lib/chief/modelRouter.ts` — the typed-client and data-switch layer underneath the above.
- `docs/agents/CHIEF_OPERATING_SYSTEM.md`, `docs/AGENT_RUNBOOK.md` — cross-checked for consistency; no contradiction found.
- Premise check: `grep -rln "ChiefCommandCenterPage\|ChiefCommandCenterView" src/` (no matches), route search across `src/` (no matches), `git branch -a` and `git log --all --oneline -i --grep="command-center\|ChiefCommandCenter"` (no relevant matches), `git grep` for `ChiefCommandCenterPage` across every local branch tip (no matches).
