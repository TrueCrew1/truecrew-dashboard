# Research Agent Live — PR #210 Deliverable

**PR:** [TrueCrew Dashboard PR #210](https://github.com/TrueCrew1/truecrew-dashboard/pull/210)

Fixes approve-path state transition and visibility in the live Research queue, adds a fail-closed runner CLI, and keeps the schema/API contract aligned with `research_requests` + `/api/research`.

## Root cause

Three defects on an otherwise correct schema/API path:

1. **Live-loading race**
   - With `VITE_USE_LIVE_API=true`, `serverRequests` stayed `null` until the first `GET /api/research` completed.
   - During that window the rail behaved like `"session"`.
   - `updateRequestStatus` resolved only against `serverRequests`, then `sessionRequests` — not the static adapter seed list.

2. **Adapter/session mismatch**
   - Start-research cards included queued adapter backlog ids (e.g. `req-ms-painting-v2-*`).
   - Those ids were not in `sessionRequests`.
   - Approve-path resolution threw `Research request not found: …`.

3. **Silent approve**
   - `ChiefApprovalsContext.releaseResearchRequest` caught that throw as `approval_release_failed` and still recorded the approval decision.
   - UI could show **approved** while the queue row stayed **queued** and no `PATCH` ran.

Fourth amplifier:

4. **Visibility gap**
   - Live queue fetched once on mount (no soft-poll).
   - Even after a later successful `PATCH` or runner update, the queue could stay stale until hard reload.

Not a runner pickup defect in approve → `in_progress`. Contract: **approval** moves `queued` → `in_progress`; the runner only picks already-released `in_progress` rows. Docs described that model; the CLI did not yet exist.

## Fix shipped

### Research queue behavior

- `"loading"` rail while live API is on and the first fetch has not completed.
- Resolve order: **override → server → session → static adapter**.
- When live API is enabled, always `PATCH /api/research/:id` (including before `serverRequests` is populated).
- Optimistic local `in_progress`; revert + `syncError` on PATCH failure.
- `POST` create whenever `isLiveApiEnabled()` (including during `"loading"`), not only when `rail === "live"`.
- Session/offline: promote adapter rows into the session store so approve / Start work persist locally.
- Soft-poll live queue every **30s** + manual `refreshLiveQueue`.

### UI visibility

- `ResearchQueuePanel`: loading, live/session copy, sync error, Retry.
- `MsResearchStatusCard`: rail state, sync error, `in_progress` focus.

### Runner CLI

- `lib/research/runnerClient.ts`, `scripts/research-runner.ts`, `npm run research:runner`.
- Fail closed when `TRUECREW_API_URL` or `TRUECREW_INTERNAL_KEY` is missing.
- `pickup` / `run` select oldest `in_progress` only.
- Does **not** auto-approve; does **not** move `queued` → `in_progress`.

### Logging

- Clearer API log when the `research_requests` relation is missing.
- Handoff / postmortem `failMission` paths `console.error` blocked/failed reasons.

`ChiefApprovalsContext.releaseResearchRequest` is unchanged. The called context no longer throws for known adapter/loading rows on the approve path; it still throws for truly unknown ids.

## Files changed

| File | Change |
|---|---|
| `src/context/ResearchRequestsContext.tsx` | Approve, persist, optimistic override, revert, soft-poll |
| `src/components/research/ResearchQueuePanel.tsx` | Loading / live / error / retry |
| `src/components/research/MsResearchStatusCard.tsx` | Rail, sync error, in-progress focus |
| `src/components/chief/chiefResearchCommand.ts` | Treat `loading` like live for create messaging |
| `src/lib/search/actionRouter.ts` | Same for command routing |
| `lib/research/runnerClient.ts` | Fail-closed runner client (**added**) |
| `scripts/research-runner.ts` | CLI: `status`, `pickup`, `run`, `done`, `block` (**added**) |
| `tests/research-runner-client.test.ts` | Env + pickup tests (**added**) |
| `api/research/dispatch.ts` | Missing-table log |
| `lib/research/projectSummaryHandoff.ts` | Louder mission failure logs |
| `lib/research/monitorIncidentPostmortem.ts` | Louder mission failure logs |
| `docs/RESEARCH_RUNNER.md` | CLI usage |
| `.env.example` | `TRUECREW_API_URL`, `TRUECREW_INTERNAL_KEY` |
| `package.json` | `research:runner` script |

## Verification completed

Branch: `cursor/research-agent-live-4a27`

| Check | Result |
|---|---|
| `npm test` | 52 files / 342 tests passed |
| `npm run lint` | Clean |
| `npm run build` | Clean (`tsc -b && vite build`) |
| `npm run check:api-functions` | 12 / 12 |
| `npm run research:runner -- status` | Fails closed without `TRUECREW_API_URL` / `TRUECREW_INTERNAL_KEY` |

Not verified in this environment:

- Browser smoke: Chief approve → queue UI
- Live Supabase `db:push`
- Production Vercel env wiring
- End-to-end runner against a deployed API with `TRUECREW_*` configured

## Supported path now

After ops configuration:

1. Queued rows (live DB or adapter/session) produce Start research cards in Chief → Approvals.
2. Operator approves; `releaseResearchRequest` → `updateRequestStatus(id, "in_progress")`.
3. Live mode: optimistic **In progress**, then `PATCH /api/research/:id`; soft-poll (30s) + manual refresh reduce stale UI.
4. PATCH failure: revert local state + surface `syncError`.
5. Session/offline: adapter rows promote into session store and persist locally.
6. Runner CLI picks oldest `in_progress` only; never mutates `queued` by itself.

## Remaining blockers

Outside this PR:

- Confirm `research_requests` on live Supabase.
- Production `VITE_USE_LIVE_API=true`.
- Matching `INTERNAL_API_SECRET`, `VITE_INTERNAL_KEY`, Supabase URL, service role.
- Research runner env: `TRUECREW_API_URL`, `TRUECREW_INTERNAL_KEY`.
- Azure LLM + Obsidian vault for handoff/postmortem mission paths.
- Production smoke: approve Start-research → queue `in_progress` → `research:runner pickup`.

Intentional non-blockers:

- No autonomous Build runner (V1)
- Marketer remains mock
- July UI debt is separate
- 30s soft-poll traffic is an accepted tradeoff

## Reviewer focus

- `updateRequestStatus` resolve order
- Live PATCH + optimistic revert
- `statusOverrides` vs soft-poll
- Adapter → session promotion and id dedupe
- Runner never touches `queued` rows

**Risk:** low to medium pending production smoke — scoped and test-clean; live browser and deployed-env path still need confirmation.

## Dev / staging runbook

End-to-end path once env is set. Migration: `supabase/migrations/20260722000001_research_requests.sql` (seeded adapter ids such as `req-ms-painting-v2-market-scan`).

### 0. Prerequisites

```bash
npm run db:push   # apply research_requests if missing
```

App / Vercel:

- `VITE_USE_LIVE_API=true`
- Matching `INTERNAL_API_SECRET` + `VITE_INTERNAL_KEY`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

Runner shell:

```bash
export TRUECREW_API_URL=https://<your-deploy>.vercel.app
export TRUECREW_INTERNAL_KEY=<same as INTERNAL_API_SECRET>
```

### 1. Seed / confirm a queued row

Migration seeds already include queued adapter rows. Or create from the app:

- Command bar / Chief: `start research on <topic>` (POSTs when live API is on).

Expected UI: Knowledge → Research queue shows the row as **Queued** with a live badge.

### 2. Approve in Chief → Approvals

1. Open Chief with **global** context (Start-research cards are global-only).
2. Find card **Start research: &lt;topic&gt;** (`apr-research-start-<requestId>`).
3. Approve.

Expected:

- Card decision recorded as approved.
- Queue row → **In progress** (optimistic immediately; persisted via `PATCH /api/research/:id`).
- Soft-poll (30s) / Retry keeps UI aligned without hard reload.
- On PATCH failure: status reverts + `syncError` banner.

### 3. Runner pickup

```bash
npm run research:runner -- status   # counts + all rows
npm run research:runner -- pickup   # oldest in_progress (exit 2 if none)
npm run research:runner -- run      # pickup + next-step hints
```

Expected: printed id matches the approved request; other **queued** rows are listed but not selected.

### 4. Complete or block

After investigation / filing a provisional finding:

```bash
npm run research:runner -- done --id <id> --path knowledge/findings/m-and-s/<note>.md
# or
npm run research:runner -- block --id <id> --note "<why>"
```

Expected:

- `done` / `block` refuse **queued** ids (runner guard — approve first).
- Queue / M&S status card show **Done** or **Blocked** after soft-poll.

### 5. Automated verification (no live env)

```bash
npm test -- tests/research-runner-client.test.ts tests/api-research-requests.test.ts
```

Covers: resolve order (adapter during loading), soft-poll override prune, fail-closed env, oldest `in_progress` pickup, mocked approve → pickup → done, API GET/PATCH transitions, runner refusal to mutate queued rows.

