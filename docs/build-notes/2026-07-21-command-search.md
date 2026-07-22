# Command search + routing (2026-07-21)

**Scope:** True Crew Dashboard — unified search and command layer behind the TopBar
command bar and Chief integration.

**Not the same as:** `src/components/chief/chiefCommandRouter.ts` (Chief panel
deterministic ops router). Command search can *hand off* to Chief via
`chiefCommandFocus.ts`; it does not replace the panel router.

---

## Module layout

| File | Role |
|------|------|
| `src/lib/search/types.ts` | Domain types (`SearchResult`, `CommandIntent`, etc.) |
| `src/lib/search/normalize.ts` | Tokenization + scoring |
| `src/lib/search/commandParser.ts` | Deterministic intent parsing |
| `src/lib/search/unifiedSearch.ts` | `executeUnifiedSearch()` |
| `src/lib/search/actionRouter.ts` | `dispatchAction()` — navigate / Chief / ecosystem |
| `src/lib/search/ranker.ts` | Grouped ranking |
| `src/lib/search/observability.ts` | `[command-search]` console events |
| `src/lib/search/context.ts` | `buildSearchDataContext()` |
| `src/lib/search/providers/index.ts` | Per-entity search providers |
| `src/lib/search/index.ts` | Barrel export |
| `api/search/index.ts` | `GET` / `POST` `/api/search` |
| `src/components/layout/CommandBar.tsx` | TopBar UI (`⌘K`, grouped results, Enter dispatch) |
| `src/components/chief/chiefCommandFocus.ts` | Chief command-input bridge |
| `src/lib/api/client.ts` | `fetchUnifiedSearch`, `dispatchUnifiedSearchAction` |
| `src/lib/search/commandSearch.test.ts` | Parser, search, dispatch tests |

---

## What is live (implementation)

| Layer | Status |
|-------|--------|
| Domain types, parser, router, service, providers, observability | **Live** |
| Search API (`GET` / `POST` `/api/search`) | **Live** — requires `x-internal-key` |
| Command bar UI in TopBar | **Live** — searches locally by default |
| Chief focus bridge → `ChiefPanel` command tab | **Live** — prefills input; does not auto-run panel router |
| Client API helpers | **Live** — optional server path |

---

## Data sources and `SearchResult.source`

Each result carries `source: "live" | "mock" | "adapter"`:

| Entity | Provider | Trust | Notes |
|--------|----------|-------|-------|
| Tasks | `searchTasks` | **Live-backed** | `source: live` when `dataRail === "supabase"`; `mock` on default dev rail |
| Customers | `searchCustomers` | **Live-backed** | Same rail rule |
| Runbooks, prompts, notes | `searchDocuments` | **Live-backed** | Same rail rule |
| Focus queue, approvals | `searchActiveWork` | **Live-backed** | Approvals when `approvalCandidates` passed |
| V2 program cards / roadmaps | `searchProjects` + doc paths | **Adapter** | Static `src/data/v2Program.ts`; always `adapter` |
| Research queue | `searchActiveWork` | **Adapter** | Static `src/lib/research/requests.ts`; always `adapter` |
| Agent work board | `searchAgents` | **Mixed** | `agentWorkBoardMock.ts` rows + any `source: live` items |

**Rule:** Do not describe adapter or mock-rail hits as fully live operational state.
Check TopBar `DataContext.source` badge (`mock` / `supabase` / `mock-fallback`).

Context: `buildSearchDataContext(data, { dataRail, approvalCandidates })`.

---

## Chief vs ecosystem routing

**Chief routing** (`assignmentTarget: "chief"`):
- Operational queries (risk, blockers, approvals, incidents, alerts)
- `continue_work` when no direct entity match
- `route_to_chief` / `chief_query` actions
- Mechanism: `requestChiefCommandFocus()` → Chief command tab (prefill only)

**Ecosystem routing** (`assignmentTarget: "ecosystem"` or specialist):
- `start_research` → Knowledge route + Chief prefill for research handoff
- `assign_agent` / `route_to_ecosystem` → Agents-oriented route
- Specialist targets: `Research Agent`, `Workflow Gate Agent`, `Librarian Agent`, etc.

Action results log via `[command-search]` (`observability.ts`).

---

## API

```bash
# Search only
GET /api/search?q=billing

# Search + dispatch action interpretation
POST /api/search
{ "query": "open M&S roadmap" }
```

Requires `x-internal-key` (same as other `/api/*` routes).

CommandBar runs search locally against `DataContext` for instant results; API is for
server parity and headless use.

---

## Extension points (not shipped)

1. LLM intent parsing — `parseCommand()` fallback
2. Semantic search — `providers/semantic.ts`
3. ms-painting federation — `providers/ms-painting.ts`
4. Approval payloads from action router for Chief gates
5. DB-backed agent queue replacing mock agent work items

---

## Verify

```bash
cd /Users/truecrew/truecrew-dashboard
npm run test -- src/lib/search/commandSearch.test.ts
npm run build
```

Manual: `⌘K` → `billing`, `open M&S roadmap`, `start research on notification vendor`,
`assign security review to ecosystem`, `what is blocked` (Chief handoff).

Second-brain pointer (not canonical): `knowledge/reference/unified-command-search.md`.
