---
title: Unified command/search reference
type: reference
status: active
confidence: high
last_reviewed: 2026-07-21
related_pages: [chief-approvals, command-bar-operational-layer]
related_prs: []
---

# Unified command/search reference

**Pointer map** for the real TopBar command/search layer in truecrew-dashboard — not a
cosmetic search box. This is unified retrieval **plus** intent parsing and action
dispatch.

**Canonical repo doc (executable procedures, full detail):**
[`docs/build-notes/2026-07-21-command-search.md`](../../docs/build-notes/2026-07-21-command-search.md)

**Related (separate concern):**
[`docs/internal/chief-command-center-runtime-truth.md`](../../docs/internal/chief-command-center-runtime-truth.md)
— Chief front-door truth; command search lives on TopBar + `/api/search`, not
`ChiefPanel`'s deterministic router alone.

---

## What shipped

| Surface | Path |
|---|---|
| Implementation | `src/lib/search/` — types, providers, `parseCommand()`, `executeUnifiedSearch()`, `dispatchAction()` |
| API | `GET /api/search`, `POST /api/search` — `api/search/index.ts` |
| UI | `CommandBar` in `TopBar` — `src/components/layout/CommandBar.tsx` |
| Chief bridge | `src/components/chief/chiefCommandFocus.ts` |
| Logs | `[command-search]` — `src/lib/search/observability.ts` |
| Tests | `src/lib/search/commandSearch.test.ts` |

Barrel: `src/lib/search/index.ts`. Client helpers: `src/lib/api/client.ts`
(`fetchUnifiedSearch`, `dispatchUnifiedSearchAction`).

---

## Query flow

1. Input in TopBar `CommandBar` (`⌘K`).
2. Local index (default UX): `buildSearchDataContext()` → `executeUnifiedSearch()`.
3. `parseCommand()` → `CommandIntent` (`search` | `action` | `chief_query`).
4. Providers score + rank → grouped results + suggested actions.
5. Enter/selection → `dispatchAction()` (navigate, Chief focus, or ecosystem route).
6. Optional server path: `GET/POST /api/search` (requires `x-internal-key`); UI does
   not depend on it for instant results.

Full step-by-step and API examples: canonical build note above.

---

## Routing model

Three paths — document separately; do not conflate:

| Path | Mechanism | Distinct from |
|---|---|---|
| **Chief** | `chief_query`, ops keywords, `continue_work`, `route_to_chief` → `chiefCommandFocus.ts` prefills Chief command input | `resolveChiefCommand()` in `chiefCommandRouter.ts` (Chief **panel** router) |
| **Ecosystem** | `start_research`, `assign_agent`, specialist targets → Agents/Knowledge routes | Chief approval gates (still need cards) |
| **Navigation** | `open_entity`, top match, `create_task` → `navigate()` via `chiefRoutes.ts` | Inline DB writes (`create_task` routes only) |

Chief handoff **prefills** input; it does not auto-run Chief's internal resolver.

---

## Source trust

Classify every provider before citing search results as operational truth.

| Trust | Sources | Repo anchor |
|---|---|---|
| **Live** | Tasks, customers, runbooks, prompts, notes, focus queue, approvals | `DataContext` / Supabase when live rail enabled |
| **Adapter-backed** | V2 program cards, roadmaps, research queue | `src/data/v2Program.ts`, `src/lib/research/requests.ts` |
| **Mixed** | Agent work items | `agentWorkBoardMock.ts` + live-derived Agents tab lanes |

Context builder: `src/lib/search/context.ts`. Check `DataContext.source` badge
(`mock` / `supabase` / `mock-fallback`) — results follow the rail.

**Rule:** Never describe adapter or mixed hits as fully live ops state.

---

## Observability

| Signal | Where |
|---|---|
| Runtime logs | Grep `[command-search]` in browser/server console |
| Unit tests | `npm run test -- src/lib/search/commandSearch.test.ts` |
| API probe | `GET /api/search?q=…` with `x-internal-key` |
| Input rail | `DataContext.source` |

**Debug order:** data rail → tokenization (`normalize.ts`) → provider match → Chief
subscription (`ChiefPanel` + `chiefCommandFocus`) → API auth (`VITE_INTERNAL_KEY` /
`INTERNAL_API_SECRET`).

---

## Limitations and extension points

**Current limits (see build note for detail):**
- Deterministic parser only — no semantic/LLM intent in command search yet.
- CommandBar searches locally by default.
- Program/roadmap hits are knowledge cards, not deploy state.
- Agent rows can include mock data.

**Extension points (planned in build note, not shipped):** LLM `parseCommand()` fallback,
`providers/semantic.ts`, `providers/ms-painting.ts`, approval payloads from action
router, DB-backed agent queue.

---

## Canonical repo links

| Topic | Path |
|---|---|
| Feature doc | `docs/build-notes/2026-07-21-command-search.md` |
| Chief panel router (related) | `src/components/chief/chiefCommandRouter.ts` |
| Routes | `src/components/chief/chiefRoutes.ts` |
| Data rail | `src/context/DataContext.tsx` |

## Related vault pages

- [Command bar operational layer](../lessons/command-bar-operational-layer.md) — pattern
  lesson
- [Chief approvals](../concepts/chief-approvals.md) — gated actions still need cards
- [True Crew Dashboard](../projects/truecrew-dashboard.md) — umbrella project
