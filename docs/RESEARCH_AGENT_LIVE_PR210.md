# Research Agent Live — PR #210 Deliverable

**PR:** [TrueCrew Dashboard PR #210](https://github.com/TrueCrew1/truecrew-dashboard/pull/210)

PR #210 fixes approve-path state transition and visibility in the live Research queue, adds a fail-closed runner CLI, and keeps the schema/API contract aligned with `research_requests` + `/api/research`.

## Root cause

Three defects stacked on an otherwise correct schema and API path:

1. **Live-loading race**
   - With `VITE_USE_LIVE_API=true`, `serverRequests` stayed `null` until the first `GET /api/research` completed.
   - During that window, the rail behaved like `"session"`.
   - `updateRequestStatus` resolved only against `serverRequests`, then `sessionRequests` — not the static adapter seed list.

2. **Adapter/session mismatch**
   - Start-research cards included queued adapter backlog ids such as `req-ms-painting-v2-*`.
   - Those ids were not in `sessionRequests`.
   - Approve-path resolution threw `Research request not found: …`.

3. **Silent approve**
   - `ChiefApprovalsContext.releaseResearchRequest` caught that throw as `approval_release_failed` and still recorded the approval decision.
   - The UI could show **approved** while the queue row stayed **queued** and no `PATCH` ran.

A fourth issue amplified the problem:

4. **Visibility gap**
   - The live queue fetched once on mount and did not soft-poll.
   - Even after a later successful `PATCH` or runner update, the queue could stay stale until a hard reload.

This was **not** a runner pickup defect in the approve → `in_progress` transition. The contract is: approval moves `queued` → `in_progress`; the runner only picks already-released `in_progress` rows. Docs already described that model; the CLI implementation did not yet exist.

## Fix shipped

### Research queue behavior

- Add a `"loading"` rail while live API mode is on and the first fetch has not completed.
- Resolve rows in order: **override → server → session → static adapter**.
- When live API mode is enabled, always call `PATCH /api/research/:id`, including before `serverRequests` has populated.
- Optimistic local `in_progress`, then revert plus `syncError` if the PATCH fails.
- Create via `POST` whenever `isLiveApiEnabled()` is true, including during `"loading"` — not only when `rail === "live"`.
- In session/offline mode, promote adapter rows into the session store so approve and Start work persist locally.
- Soft-poll the live queue every 30 seconds, plus manual `refreshLiveQueue`.

### UI visibility

- `ResearchQueuePanel`: loading, live/session copy, sync error, and Retry.
- `MsResearchStatusCard`: rail state, sync error, and `in_progress` focus.

### Runner CLI

- Add `lib/research/runnerClient.ts`, `scripts/research-runner.ts`, and `npm run research:runner`.
- Fail closed when `TRUECREW_API_URL` or `TRUECREW_INTERNAL_KEY` is missing.
- `pickup` and `run` select the oldest `in_progress` row only.
- The runner does **not** auto-approve and does **not** move `queued` → `in_progress`.

### Logging

- Clearer API log when the `research_requests` relation is missing.
- Mission handoff and postmortem failure paths log blocked/failed reasons with `console.error`.

`ChiefApprovalsContext.releaseResearchRequest` itself is unchanged. The called context no longer throws for known adapter/loading rows on the approve path, while still throwing for truly unknown ids.

## Files changed

| File | Change |
|---|---|
| `src/context/ResearchRequestsContext.tsx` | Core approve, persist, optimistic override, revert, and soft-poll fix |
| `src/components/research/ResearchQueuePanel.tsx` | Loading / live / error / retry states |
| `src/components/research/MsResearchStatusCard.tsx` | Rail visibility, sync error, in-progress focus |
| `src/components/chief/chiefResearchCommand.ts` | Treat `loading` like live for create messaging |
| `src/lib/search/actionRouter.ts` | Same handling for command routing |
| `lib/research/runnerClient.ts` | Added fail-closed runner client |
| `scripts/research-runner.ts` | Added CLI for `status`, `pickup`, `run`, `done`, `block` |
| `tests/research-runner-client.test.ts` | Added env and pickup tests |
| `api/research/dispatch.ts` | Missing-table log improvement |
| `lib/research/projectSummaryHandoff.ts` | Louder mission failure logging |
| `lib/research/monitorIncidentPostmortem.ts` | Louder mission failure logging |
| `docs/RESEARCH_RUNNER.md` | CLI usage update |
| `.env.example` | Add `TRUECREW_API_URL` and `TRUECREW_INTERNAL_KEY` |
| `package.json` | Add `research:runner` script |

## Verification completed

Branch tested: `cursor/research-agent-live-4a27`

| Check | Result |
|---|---|
| `npm test` | 52 files / 342 tests passed |
| `npm run lint` | Clean |
| `npm run build` | Clean (`tsc -b && vite build`) |
| `npm run check:api-functions` | 12 / 12 |
| `npm run research:runner -- status` | Fails closed without `TRUECREW_API_URL` and `TRUECREW_INTERNAL_KEY` |

Not verified in this environment:

- browser smoke for Chief approve → queue UI
- live Supabase `db:push`
- production Vercel env wiring
- end-to-end runner against a deployed API with `TRUECREW_*` configured

## Supported path now

After ops configuration is completed, the code path supports this flow:

1. Queued research rows from live DB or adapter/session produce Start research cards in Chief → Approvals.
2. Operator approves a card; `releaseResearchRequest` calls `updateRequestStatus(id, "in_progress")`.
3. In live mode, the UI shows optimistic **In progress**, then persists via `PATCH /api/research/:id`; soft-poll (every 30s) plus manual refresh reduce stale visibility.
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

- No autonomous Build runner in V1
- Marketer remains mock
- July UI debt is separate
- 30-second soft-poll traffic is an accepted tradeoff

## Reviewer focus

Suggested review focus:

- `updateRequestStatus` resolve order
- live PATCH plus optimistic revert behavior
- `statusOverrides` interaction with soft-poll
- adapter → session promotion and id dedupe
- runner guarantee that it never touches `queued` rows

Current risk: **low to medium pending production smoke** — scoped and test-clean, but live browser and deployed-env path still need confirmation.
