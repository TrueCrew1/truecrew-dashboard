# Research Agent Live — PR #210

PR: [TrueCrew Dashboard PR #210](https://github.com/TrueCrew1/truecrew-dashboard/pull/210)

PR #210 fixes the approve-path state transition and visibility issues in the live Research queue, adds a fail-closed runner CLI, and keeps the schema/API contract aligned with the existing `research_requests` + `/api/research` path.

## Root cause

Three defects stacked on an otherwise correct schema and API path:

1. **Live-loading race**
   - With `VITE_USE_LIVE_API=true`, `serverRequests` remained `null` until the first `GET /api/research` completed.
   - During that window, the rail behaved like `"session"`.
   - `updateRequestStatus` resolved only against `serverRequests` and then `sessionRequests`, not the static adapter seed list.

2. **Adapter/session mismatch**
   - Start-research cards included queued adapter backlog ids such as `req-ms-painting-v2-*`.
   - Those ids were not present in `sessionRequests`.
   - Result: approve-path resolution threw `Research request not found: …`.

3. **Silent approve**
   - `ChiefApprovalsContext.releaseResearchRequest` caught that throw as `approval_release_failed` and still recorded the approval decision.
   - The UI could show **approved** while the queue row remained **queued** and no `PATCH` request ran.

A fourth issue amplified the problem:

4. **Visibility gap**
   - The live queue fetched once on mount and did not soft-poll.
   - Even when a later `PATCH` or runner update succeeded, the queue could stay stale until a hard reload.

This was **not** a runner pickup defect in the approve → `in_progress` transition. The intended contract is that approval moves `queued` → `in_progress`, while the runner only picks already-released `in_progress` rows. The docs already described that model, but the CLI for it did not yet exist.

## Fix shipped

### Research queue behavior

- Add a `"loading"` rail while live API mode is enabled and the first fetch has not yet completed.
- Resolve rows in this order: **override → server → session → static adapter**.
- When live API mode is enabled, always call `PATCH /api/research/:id`, including before `serverRequests` has populated.
- Add optimistic local `in_progress`, then revert plus `syncError` if the PATCH fails.
- Create via `POST` whenever `isLiveApiEnabled()` is true, including during `"loading"`, not only when `rail === "live"`.
- In session/offline mode, promote adapter rows into the session store so approve and Start work persist locally.
- Add live queue soft-poll every 30 seconds plus manual `refreshLiveQueue`.

### UI visibility

- `ResearchQueuePanel` now shows loading, live/session copy, sync error, and Retry.
- `MsResearchStatusCard` now reflects rail state, sync error, and `in_progress` truthfully.

### Runner CLI

- Add `lib/research/runnerClient.ts`, `scripts/research-runner.ts`, and `npm run research:runner`.
- Fail closed when `TRUECREW_API_URL` or `TRUECREW_INTERNAL_KEY` is missing.
- `pickup` and `run` select the oldest `in_progress` row only.
- The runner does **not** auto-approve and does **not** move `queued` → `in_progress`.

### Logging

- Improve API logging when the `research_requests` relation is missing.
- Make mission handoff and postmortem failure paths log blocked/failed reasons with `console.error`.

`ChiefApprovalsContext.releaseResearchRequest` itself is unchanged. The important behavioral change is that the called context no longer throws for known adapter/loading rows on the approve path, while still throwing for truly unknown ids.

## Files changed

| File | Change |
|---|---|
| `src/context/ResearchRequestsContext.tsx` | Core approve, persist, optimistic override, revert, and soft-poll fix |
| `src/lib/research/requestResolution.ts` | Pure resolve/rail/override helpers (**added**) |
| `src/components/research/ResearchQueuePanel.tsx` | Loading/live/error/retry states |
| `src/components/research/MsResearchStatusCard.tsx` | Rail visibility, sync error, in-progress focus |
| `src/components/chief/chiefResearchCommand.ts` | Treat `loading` like live for create messaging |
| `src/lib/search/actionRouter.ts` | Same handling for command routing |
| `lib/research/runnerClient.ts` | Fail-closed runner client; refuse `done`/`block` on queued |
| `scripts/research-runner.ts` | CLI for `status`, `pickup`, `run`, `done`, `block` |
| `tests/research-runner-client.test.ts` | Env, pickup, lifecycle, Flows B–D |
| `tests/api-research-requests.test.ts` | API GET/PATCH transitions (**added**) |
| `api/research/dispatch.ts` | Missing-table log improvement |
| `lib/research/projectSummaryHandoff.ts` | Louder mission failure logging |
| `lib/research/monitorIncidentPostmortem.ts` | Louder mission failure logging |
| `docs/RESEARCH_RUNNER.md` | CLI usage + smoke |
| `docs/RESEARCH_AGENT_LIVE_PR210.md` | Deliverable, readiness, QA runbook (**added**) |
| `.env.example` | Add `TRUECREW_API_URL` and `TRUECREW_INTERNAL_KEY` |
| `package.json` | Add `research:runner` script |

## Verification completed

Branch tested: `cursor/research-agent-live-4a27`

| Check | Result |
|---|---|
| `npm test` | 53 files / **363** tests passed (latest audit; see also QA commands below) |
| `npm run lint` | Clean |
| `npm run build` | Clean (`tsc -b && vite build`) |
| `npm run check:api-functions` | 12 / 12 |
| `npm run research:runner -- status` | Fails closed without `TRUECREW_API_URL` and `TRUECREW_INTERNAL_KEY` |
| CI | Green on branch |

Not verified in this environment:

- browser smoke for Chief approve → queue UI
- live Supabase `db:push`
- production Vercel env wiring
- end-to-end runner against a deployed API with `TRUECREW_*` configured

## Supported path now

After ops configuration is completed, the code path supports this flow:

1. Queued research rows from live DB or adapter/session produce Start research cards in Chief → Approvals.
2. Operator approves a card and `releaseResearchRequest` calls `updateRequestStatus(id, "in_progress")`.
3. In live mode, the UI shows optimistic **In progress**, then persists via `PATCH /api/research/:id`; polling and manual refresh reduce stale visibility.
4. On PATCH failure, local state reverts and surfaces `syncError`.
5. In session/offline mode, adapter rows are promoted into the session store and persist locally.
6. The runner CLI can pick the oldest `in_progress` row only and never mutates queued rows by itself.

## Remaining blockers

These remain outside the PR itself:

- Confirm `research_requests` is applied on live Supabase.
- Set production `VITE_USE_LIVE_API=true`.
- Ensure matching `INTERNAL_API_SECRET`, `VITE_INTERNAL_KEY`, Supabase URL, and service role are configured.
- Configure the research runner with `TRUECREW_API_URL` and `TRUECREW_INTERNAL_KEY`.
- Provide Azure LLM and Obsidian vault dependencies for handoff/postmortem mission paths.
- Run one production browser smoke: approve a Start-research card, confirm queue shows `in_progress`, then confirm `research:runner pickup`.

Intentional non-blockers:

- No autonomous Build runner in V1.
- Marketer remains mock.
- July UI debt is separate.
- 30-second soft-poll traffic is an accepted tradeoff.

## Reviewer focus

Suggested review focus:

- `updateRequestStatus` resolve order
- live PATCH plus optimistic revert behavior
- `statusOverrides` interaction with soft-poll
- adapter → session promotion and id dedupe
- runner guarantee that it never touches `queued` rows

Current risk: **low to medium pending production smoke** — scoped and test-clean, but the live browser and deployed-env path still need confirmation.

---

## True crew agent readiness

End-to-end path is wired and verified under mocks.

### What was missing

Core approve → live `in_progress` → soft-poll → runner CLI path was already on the branch. Gaps closed in the follow-up pass:

- No hard guard that runner `done` / `block` never touch `queued` rows
- Resolve/rail logic not extracted for focused unit tests
- No API-level tests for queue list, PATCH, and invalid transitions
- No mocked approve → pickup → done lifecycle test
- Runbook steps for seed → approve → runner were thin

### What changed

- `src/lib/research/requestResolution.ts` — pure resolve/rail helpers; context uses them
- `lib/research/runnerClient.ts` + CLI — refuse mutating `queued` rows on `done` / `block`
- Tests: expanded runner client tests plus new `tests/api-research-requests.test.ts` (mocked E2E)
- Docs: this runbook plus `docs/RESEARCH_RUNNER.md` smoke notes

Verified: lint clean, full suite green, build OK. Runner without env fails closed as designed. See **QA commands** below for exact numbers after the latest pass.

### How to run (dev/staging)

1. Ensure `research_requests` exists (`npm run db:push` if needed).
2. App: `VITE_USE_LIVE_API=true` plus matching internal key and Supabase.
3. Seed/confirm a `queued` row → Chief → Approvals → approve Start-research.
4. Queue shows **In progress** (optimistic; soft-poll 30s).
5. Runner: `TRUECREW_API_URL` + `TRUECREW_INTERNAL_KEY` →  
   `npm run research:runner -- status | pickup | run` then  
   `done --id … --path …` or `block`.

Without live env:

```bash
npm test -- tests/research-runner-client.test.ts tests/api-research-requests.test.ts
```

### Remaining ops (production)

Checklist before calling the live path production-ready:

- [ ] Vercel/live secrets configured: `INTERNAL_API_SECRET`, `VITE_INTERNAL_KEY` (match), `VITE_USE_LIVE_API=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Research runner host has `TRUECREW_API_URL` (deployed app origin) and `TRUECREW_INTERNAL_KEY` (same as `INTERNAL_API_SECRET`)
- [ ] Prod Supabase has `research_requests` with the same schema used in migrations/tests (`npm run db:push` / migration `20260722000001_research_requests.sql` if missing)
- [ ] Staging: `npm run research:smoke` then one browser approve → runner pickup/done
- [ ] Production: one controlled `npm run research:smoke` + one browser approve → runner pickup/done
- [ ] Kill switches verified (`VITE_USE_LIVE_API=false`, stop runner / unset `TRUECREW_*`)
- [ ] Azure LLM + Obsidian vault only if exercising handoff/postmortem mission paths (optional for queue/runner smoke)

Unchanged by design: schema/status vocabulary (`queued`, `in_progress`, `done`, `blocked`), `/api/research`, and `releaseResearchRequest` semantics.

**Rollout phase:** **0 – Code ready** until ops completes staging+prod smoke (see § Rollout plan).

---

## QA commands

Run these before reviewing or shipping:

```bash
npm test -- tests/research-runner-client.test.ts tests/api-research-requests.test.ts
npm test
npm run lint
npm run build
npm run check:api-functions
npm run research:runner -- status   # expect fail-closed without TRUECREW_*
npm run research:smoke              # expect fail-closed without TRUECREW_*
```

Expected (local agent verify):

- Focused suites green (lifecycle, resolve order, env fail-closed, queued refusal, API PATCH transitions)
- Full `npm test` green
- Lint + build clean; API function count `12 / 12`
- Runner / smoke without env print fail-closed and do not call the network

Note: the shared status transition table allows `queued` → `blocked` on the API. The Research **runner CLI** still refuses `done`/`block` on `queued` rows so approval owns the happy-path release to `in_progress`.

Automated coverage maps to Flows B–D and the happy-path lifecycle; Flow A and production smoke remain manual when live env is available.

---

## QA flows (manual + automated)

Contract under test: **approval** moves `queued` → `in_progress`; the runner only picks already-released `in_progress` and never mutates `queued`.

### Flow A — Happy path (dev/staging, manual)

End-to-end path once env is set. Migration: `supabase/migrations/20260722000001_research_requests.sql` (seeded adapter ids such as `req-ms-painting-v2-market-scan`).

#### 0. Prerequisites

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

#### 1. Seed / confirm a queued row

Migration seeds already include queued adapter rows. Or create from the app:

- Command bar / Chief: `start research on <topic>` (POSTs when live API is on).

Expected UI: Knowledge → Research queue shows the row as **Queued** with a live badge.

#### 2. Approve in Chief → Approvals

1. Open Chief with **global** context (Start-research cards are global-only).
2. Find card **Start research: &lt;topic&gt;** (`apr-research-start-<requestId>`).
3. Approve.

Expected:

- Card decision recorded as approved.
- Queue row → **In progress** (optimistic immediately; persisted via `PATCH /api/research/:id`).
- Soft-poll (30s) / Retry keeps UI aligned without hard reload.
- DB row is `in_progress` after PATCH (confirm via soft-poll or Supabase).

#### 3. Runner pickup

```bash
npm run research:runner -- status   # counts + all rows
npm run research:runner -- pickup   # oldest in_progress (exit 2 if none)
npm run research:runner -- run      # pickup + next-step hints
```

Expected: printed id matches the approved request; other **queued** rows are listed but not selected.

#### 4. Complete or block

```bash
npm run research:runner -- done --id <id> --path knowledge/findings/m-and-s/<note>.md
# or
npm run research:runner -- block --id <id> --note "<why>"
```

Expected:

- `done` / `block` refuse **queued** ids (runner guard — approve first).
- Queue / M&S status card show **Done** or **Blocked** after soft-poll.

### Flow B — Approve during `"loading"` rail

**Automated:** `tests/research-runner-client.test.ts` — “Flow B: approve during loading…”, resolve-order + `shouldPatchWhileLoading`.

**Manual (optional):**

1. Live API on; throttle or delay `GET /api/research` (DevTools / mock).
2. Reload Chief; approve a Start-research card **before** the first fetch completes.
3. Verify: no “request not found”; PATCH issued; UI lands on **In progress** (override until soft-poll).

### Flow C — Adapter/session-only ids (offline)

**Automated:** “Flow C: session/offline promote…” in `tests/research-runner-client.test.ts`.

**Manual (optional):**

1. Live API **off** (`VITE_USE_LIVE_API` unset/false).
2. Approve Start-research for an adapter id (`req-ms-painting-v2-*`).
3. Verify: row becomes session-sourced `in_progress` in the queue; survives local session; runner still refuses to `done`/`block` a `queued` id if any remain.

### Flow D — PATCH failure / `syncError`

**Automated:** “Flow D: optimistic in_progress reverts…” in `tests/research-runner-client.test.ts`.

**Manual (optional):**

1. Force `PATCH /api/research/:id` to fail (mock 500 / wrong key).
2. Approve in live mode.
3. Verify: brief optimistic **In progress**, then revert to prior status, `syncError` banner in queue / M&S card, console `[research-rail] live_update_failed`.

### Production smoke

Same steps as Flow A against production URL/secrets. Confirm schema/status vocab and `releaseResearchRequest` semantics remain unchanged.

### Automated lifecycle (no live env)

```bash
npm test -- tests/research-runner-client.test.ts tests/api-research-requests.test.ts
```

Covers: resolve order (adapter during loading), soft-poll override prune, fail-closed env (both or either `TRUECREW_*` missing), oldest `in_progress` pickup, mocked approve → pickup → done, API GET/PATCH transitions including invalid `queued` → `done`, runner refusal to mutate queued rows on `done` and `block`.

---

## Staging smoke: status and findings

### Agent environment (2026-07-24)

| Check | Result |
|---|---|
| Local secrets (`.env`, `TRUECREW_*`, Supabase) | **Absent** — cannot run live staging smoke here |
| Vercel / Supabase MCP | **needsAuth** — not usable from this agent |
| Production/public `/api/health` + `/api/research` | Reachable; returns **401 Unauthorized** without key (auth gate OK) |
| Automated contract tests | Green (`npm test`, focused research suites) |
| `npm run research:smoke` without env | Fail-closed as designed |

**Staging smoke: not executed in this agent run.** Blocked on missing staging secrets and MCP auth. Ops must run the checklist below once credentials are available.

### Staging checklist (ops)

1. `npm run db:push` (or confirm migration `20260722000001_research_requests.sql` applied).
2. App env: `VITE_USE_LIVE_API=true`, matching `INTERNAL_API_SECRET` / `VITE_INTERNAL_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. API smoke (no browser):

```bash
export TRUECREW_API_URL=https://<staging-or-preview>.vercel.app
export TRUECREW_INTERNAL_KEY=<same as INTERNAL_API_SECRET>
npm run research:smoke -- --read-only   # safe probe
npm run research:smoke                  # seed → release → pickup → done
```

4. Browser smoke: Chief → Approvals (global) → approve Start-research → queue **In progress** → soft-poll / Retry.
5. Runner: `npm run research:runner -- status | pickup | run | done --id … --path …`.
6. Record results in this section (pass/fail + date + env URL).

### Staging findings template

```
Date:
Env URL:
db:push / research_requests present: yes/no
research:smoke: pass/fail
Browser approve → in_progress: pass/fail
Runner pickup/done; queued untouched: pass/fail
Notes / deviations:
```

---

## Production wiring and smoke

### Production readiness checklist

- [ ] Prod Supabase has `research_requests` (same schema as migration/tests)
- [ ] Deployed app exposes `/api/research` against prod DB
- [ ] `VITE_USE_LIVE_API=true`
- [ ] `INTERNAL_API_SECRET` ↔ `VITE_INTERNAL_KEY` match
- [ ] Runner: `TRUECREW_API_URL` = prod origin, `TRUECREW_INTERNAL_KEY` = prod secret
- [ ] One controlled smoke: `npm run research:smoke` then one browser approve → runner pickup/done
- [ ] Kill switches verified (below)

### Production smoke: status

| Check | Result |
|---|---|
| Public prod API without key | **401** (auth present) — observed 2026-07-24 |
| Full prod smoke with secrets | **Not run** in agent env — ops required |

### Ops guardrails (disable / fallback)

| Goal | Action |
|---|---|
| Disable live Research queue UI | Set `VITE_USE_LIVE_API=false` (or unset) and redeploy — app falls back to session/offline rail |
| Stop runner mutations | Unset `TRUECREW_*` on the runner host, or stop the scheduled job — CLI fail-closed, no PATCH |
| Pause only writes | Do not approve Start-research cards; leave rows `queued` |
| Recover UI after bad live state | Queue **Retry** / soft-poll; or toggle live API off temporarily |

---

## Rollout plan

| Phase | Who | How enabled | Current |
|---|---|---|---|
| **0 – Code ready** | Engineers | PR merged; secrets not required for offline | **Here** (PR #210) until ops smoke |
| **1 – Internal only** | Founder / internal | Prod secrets + `VITE_USE_LIVE_API=true`; runner on internal host only; no broad announce | Next after staging+prod smoke |
| **2 – Limited pilot** | Selected operators | Same flags; limited Start-research usage; watch logs | After Phase 1 stable |
| **3 – Default on** | Supported scenarios | Live API default for deployed app; runner scheduled | After pilot |

There is **no separate role feature-flag** today — the live path is gated by `VITE_USE_LIVE_API` + presence of runner env. Role-based gating is a follow-up if needed.

### Monitoring (what exists today)

| Signal | Where |
|---|---|
| Approve → live PATCH failures | Browser console `[research-rail] live_update_failed`; UI `syncError` |
| Live fetch / soft-poll failures | `[research-rail] live_fetch_failed` / `live_soft_poll_failed` |
| Missing `research_requests` relation | API `api/research/dispatch.ts` logs |
| Runner refuse queued | CLI error `Runner refuses to … queued` (no PATCH) |
| Mission handoff/postmortem fails | `console.error` in handoff/postmortem modules |

No dedicated metrics backend yet — treat Vercel function logs + browser `syncError` as the inspection path. Re-run `npm run research:smoke -- --read-only` after incidents.

---

## Incident response

### Symptoms

- Start-research approve shows approved but queue stays **Queued**
- Queue shows `syncError` / status flickers after approve
- Runner `pickup` empty while UI claims In progress
- Runner or API 401/503
- Soft-poll never catches up

### Immediate mitigations

1. Stop the runner job / unset `TRUECREW_*` (fail-closed).
2. Set `VITE_USE_LIVE_API=false` and redeploy if UI is misleading operators.
3. Do not approve additional Start-research cards until diagnosis.

### Where to look

1. Vercel logs for `/api/research` (auth, missing table, 409 transitions).
2. Browser console `[research-rail]*` and queue `syncError` banner.
3. Supabase: `research_requests` row status for the id on the card.
4. Runner stdout for refuse-queued / env incomplete messages.

### Re-verify

```bash
npm test -- tests/research-runner-client.test.ts tests/api-research-requests.test.ts
npm run research:smoke -- --read-only   # with staging/prod TRUECREW_*
npm run research:runner -- status
```

Then one controlled browser approve on staging before re-enabling prod runner.

---

## Audit snapshot (filing + function)

| Area | Status |
|---|---|
| Migration `research_requests` + seeds | Filed; matches adapter ids |
| `/api/research` GET/POST/PATCH | Connected via `dispatch` rewrite |
| Approve → `in_progress` + soft-poll + syncError | Wired; overrides survive soft-poll until server matches |
| Runner CLI fail-closed + oldest `in_progress` + refuse queued | Wired + tested |
| Canonical doc + `.env.example` + `RESEARCH_RUNNER.md` | Filed |
| Automated tests | Green; React/RTL context tests **not** present (Flows B–D are pure/mocked) |
| Live browser / staging / prod smoke | **Blocked in agent env** (no secrets); API 401 without key confirmed |
| `npm run research:smoke` | Added — ops API smoke when `TRUECREW_*` set |
| PR draft state | Still **draft** until human marks ready |

### Blocking (ops — not code)

1. Authenticate / provide staging+prod secrets (`TRUECREW_*`, Supabase, matching internal keys).
2. Run staging checklist (`db:push` → `research:smoke` → browser approve → runner).
3. Run one production smoke; then advance rollout Phase 0 → 1.
4. Confirm kill switches (`VITE_USE_LIVE_API`, stop runner) once.

### Concerns (non-blocking)

- No React integration tests for `ResearchRequestsContext` / queue UI (pure helpers + API mocks cover contract).
- UI **Block** on a queued row can call API `queued` → `blocked` (allowed by status table); runner CLI still refuses — intentional asymmetry.
- Handoff/postmortem missions need Azure LLM + Obsidian (optional for queue/runner path).
- Older PR comments may cite stale test counts (342/355); canonical numbers live in this doc + latest QA comment.
- Packet-spec still labels AgentPacket runner as future work (different layer than queue CLI) — easy to misread.
