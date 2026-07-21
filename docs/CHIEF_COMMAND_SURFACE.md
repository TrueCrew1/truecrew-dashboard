# Chief command surface — implementation note

Wiring slice: shared submit path, real async endpoint, deterministic-first routing,
AI fallback only when unmatched, mission-backed command approvals, dead TopBar search removed.

## Files changed

### New
- `lib/chief/commandTypes.ts` — request/response types for the command API
- `lib/chief/resolveCommand.ts` — deterministic regex/rule router (shared)
- `lib/chief/chiefAiFallback.ts` — Azure Foundry / LLM router `chief` lane fallback
- `lib/chief/runChiefCommand.ts` — resolve → optional AI fallback orchestrator
- `api/chief/command.ts` — `POST /api/chief/command`
- `src/lib/api/chiefCommand.ts` — browser client
- `src/components/chief/submitChiefCommand.ts` — single submit helper (history + approvals)
- `tests/api-chief-command.test.ts`
- `tests/chief-resolve-command.test.ts`
- `docs/CHIEF_COMMAND_SURFACE.md` (this file)

### Updated
- `src/components/chief/chiefLiveContext.ts` — thin wrapper over `lib/chief/resolveCommand`
- `src/components/chief/ChiefPanel.tsx` / `ChiefHomePanel.tsx` — use `submitChiefCommand`, real async loading/errors
- `src/components/chief/chiefMock.ts` — missionKind / missionProjectId on command approvals
- `src/components/chief/types.ts` — `matched`, `resolution`, mission fields on `ChiefResponse`
- `src/components/layout/TopBar.tsx` — removed dead global search input
- `src/styles/global.css` — dropped unused `.topbar-search*` rules
- `src/components/chief/chiefDecisionTier.ts` — comment points at real `chiefAiFallback.ts`

## Endpoint

**`POST /api/chief/command`** (internal auth: `x-internal-key` / `requireInternalAuth`)

### Request body
```json
{
  "prompt": "string (required)",
  "source": "home | sidebar | topbar (optional)",
  "context": { "page": "string?", "section": "string?" },
  "liveContext": { /* ChiefCommandLiveContext */ },
  "knowledge": { "runbooks": [], "prompts": [], "notes": [] },
  "workflows": [ { "id", "title", "stage", "owner", "summary", "linkedTaskIds" } ],
  "approvals": [ { "id", "title", "summary", "status", "specialist?", "category?", "riskNote?" } ]
}
```

### Response
`ChiefCommandResult` plus echoed `source` / `context`:
- `summary`, `recommendedAction`, `routedTo`, `specialists?`, `blockers?`
- `approvalNeeded?`, `approvalTitle?`, `approvalPrompt?`, `riskNote?`
- `matched: boolean` — `false` means no deterministic branch
- `resolution: "deterministic" | "ai_fallback" | "ai_fallback_unavailable"`
- `missionKind?`, `missionProjectId?` — when set, approve uses existing Research runners

## Where deterministic routing lives

`lib/chief/resolveCommand.ts` → `resolveChiefCommand()`.

Client still exposes the old signature via `src/components/chief/chiefLiveContext.ts` for local/demo use.

## How AI fallback is invoked

`lib/chief/runChiefCommand.ts`:
1. Run deterministic `resolveChiefCommand`
2. If `matched === true` → return that result
3. Else → `runChiefAiFallback()` (`lib/chief/chiefAiFallback.ts`) via `runTask({ lane: "chief", complexity: "medium" })`
4. Missing `AZURE_OPENAI_API_KEY` / Foundry endpoint, or provider error → `resolution: "ai_fallback_unavailable"` (no fake model text)

Demo mode (`VITE_USE_LIVE_API` not true): client runs local deterministic resolve only; unmatched prompts get `ai_fallback_unavailable` (no API call).

## Command intents → real work vs propose-only

| Intent | Behavior |
|--------|----------|
| Risk/status, blockers, approvals list, missing context, incidents, alerts, knowledge search | Deterministic Q&A; some may enqueue **propose-only** approvals (no `missionKind`) |
| “Propose a postmortem…” / research+incident wording | Approval with `missionKind: research:monitor-incident-postmortem` + incident id → **approve runs existing postmortem mission** |
| “Propose a project summary handoff…” | Approval with `missionKind: research:project-summary-handoff` + workflow id → **approve runs existing handoff mission** |
| Unmatched free text | AI fallback when live API + Azure configured; otherwise unavailable message |

This is **not** a full AI OS. It is a wired command surface: one submit path, real endpoint, rules first, AI second, and two Research mission intents on the existing approve → execute path.

## Env

- Client live calls: `VITE_USE_LIVE_API=true`, `VITE_INTERNAL_KEY` (matches server `INTERNAL_API_SECRET`)
- AI fallback: `AZURE_OPENAI_API_KEY`, `AZURE_AI_RESOURCE_ENDPOINT` (or `AZURE_OPENAI_ENDPOINT`)
