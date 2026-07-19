# Chief V1 Governed Loops

Chief V1 now has several real governed loops wired end-to-end in the dashboard. Each loop below is implemented today and backed by code paths in this repo — not a roadmap or design intent.

---

### Approved Project Summary → Build Handoff

- **Trigger:** Build proposal → Chief approval on handoff card.
- **Execution:** Research mission (`research:project-summary-handoff`) runs with Supabase workflow context and writes mission record, handoff note, artifact JSON, and Build Log entry.
- **Status & artifacts:** Cards show mission execution feedback; Today shows mission status via `AgentMissionsCard`; artifact paths are surfaced as metadata.

### Monitor issue → Chief approval card → situation brief

- **Trigger:** Live monitor probes (Vercel/Supabase) report degraded state.
- **Execution:** Chief surfaces a single monitor approval card plus a platform situation brief derived from monitor state.
- **Status:** Monitor guidance lives on `/monitor`; Chief brief and approvals show truthful mock/live/unavailable/degraded states.

### Chief approval decision → durable activity + execution feedback

- **Trigger:** Operator approves/rejects/sends back via Chief approvals.
- **Execution:** Decision recorded in Supabase; vault JSON + decision note appended; execution feedback line shows mission / informational outcome.
- **Visibility:** Decisions persist to vault activity JSON in live mode; execution feedback appears on approval cards. Today shows governed approval activity via `ApprovalActivityCard` with deep-link navigation into Chief Approvals.

### Mission outcome → artifact/result references

- **Trigger:** Handoff or monitor-incident-postmortem mission completes/blocks/fails.
- **Execution:** Mission records include paths for mission JSON, note, artifact JSON, and Build Log when available.
- **Visibility:** Approval cards show compact result references derived from real mission payloads.

### Monitor incident → Research postmortem mission

- **Trigger:** Active incident on Monitor → Research postmortem approval card (`research:monitor-incident-postmortem`).
- **Execution:** Approved decision runs Research against Supabase incident context; writes postmortem note, artifact JSON, mission record, and Build Log on success.
- **Status & artifacts:** Same execution feedback, approval activity, and result-link surfaces as project handoff missions.

---

## V1 constraints

- Scope is limited to these loops. V1 includes Slack notifications for governed approvals, missions, and monitor state (see Slack expectations below) — it does not include voice integrations, a generic mission framework, or background retries/queues.
- Mock mode is honest: no fake mission completions, no fabricated durable history, and no placeholder artifact paths.

---

## Pre-merge checks

### Governance check helper
Before merging any Chief-governed change to `main`, run:

```bash
bash scripts/check-governance.sh
```

This script:
- Reports branch status for `main` and the governed-loop feature branches.
- Runs lint, build, and test, marking each as [PASS]/[FAIL].
- Confirms governed-loop coverage (missions, approvals, monitor, agent surfaces, Slack wiring).

Use `bash scripts/check-governance.sh --skip-checks` when you only need a quick status/coverage snapshot without re-running lint/build/test.

## Production sanity pass

Checked **2026-07-19 (UTC)** against [https://truecrew-dashboard.vercel.app](https://truecrew-dashboard.vercel.app), commit `eafdd3d` (assumed live).

**Mode assumption:** `VITE_USE_LIVE_API=true` at build time — set in `.github/workflows/deploy-vercel.yml` and `.env.example`; if unset in the Vercel build env, the UI stays in mock mode and client-side Slack hooks do not fire.

### API expectations

| Endpoint | Method | Unauthenticated result | Body shape | SPA HTML? |
|----------|--------|--------------------------|------------|-----------|
| `/api/chief/governed-slack-notify` | POST | 401 | `{"error":"Unauthorized"}` | No — `content-type: application/json` |
| `/api/research/project-summary-handoff` | GET | 401 | `{"error":"Unauthorized"}` | No |
| `/api/chief/approval-activity` (rewrite) | GET | 401 | `{"error":"Unauthorized"}` | No |
| `/api/dev/governed-slack-test` (rewrite) | POST | 401 (auth runs first) | `{"error":"Unauthorized"}` | No |
| `/` (SPA) | GET | 200 | `<!doctype html>…` | Yes (baseline) |

- All governed API routes sit behind `requireInternalAuth` — `x-internal-key` must match `INTERNAL_API_SECRET`. An invalid key also returns **401** with the same JSON shape.
- Rewrites in `vercel.json` route legacy URLs to consolidated handlers (Hobby 12-function limit); public paths are unchanged. `/api/research/project-summary-handoff` → `/api/research/dispatch?kind=project-summary-handoff`.
- Governed routes always return JSON — never the SPA HTML shell, even unauthenticated.

### Slack expectations

**Server helper:** `lib/governedLoopSlack.ts` POSTs `{ "text": "<message>" }` to `SLACK_WEBHOOK_URL`.

| Event | Trigger | Slack message pattern |
|-------|---------|----------------------|
| Approval created | Client `ChiefApprovalsContext` → `notifyGovernedApprovalCreated` → `POST /api/chief/governed-slack-notify` (live API only) | `Chief approval created: <approvalId> (<kind>) for incident <incidentId or n/a>.` |
| Approval updated | Server `POST /api/chief/approvals` after decision persisted → `scheduleGovernedApprovalUpdatedSlack` | `Chief approval updated: <approvalId> is <status> (kind=<kind>, incident=<incidentId or n/a>).` |
| Mission status | Server mission runners on save (`running`, `completed`, `failed`, `blocked`) → `scheduleGovernedMissionSlack` | `Governed mission <missionId> status: <status> (approval=<approvalId>, result=<path or none>).` |
| Monitor state | Client `ChiefApprovalsContext` on monitor tone change → `notifyGovernedMonitorState` (live API only; deduped per browser session) | `Monitor state: <state> (probe=<probeId>, incident=none).` |

- Governed approvals = any card with `missionKind` set, or a monitor platform card (`apr-monitor-platform-*`).
- Statuses in code are `approved` / `rejected` / `sent_back` — not "denied/cancelled".
- No separate `queued` Slack message — a mission goes straight to `running` on first server save.
- Mock mode (`VITE_USE_LIVE_API` false): tone `mock`, probe `mock` — client Slack hooks are skipped entirely.

### Production smoke test

The dev-only test endpoint (`POST /api/dev/governed-slack-test`, rewritten to `/api/chief/approvals?view=slack-test`) only works when `NODE_ENV`/`VERCEL_ENV` ≠ `production`. It is intentionally disabled in production — with a valid `x-internal-key`, prod returns **404** `{"error":"Not found"}` by design (`isDevEnvironment()` guard).

For production, use the same notify path the app uses:

```bash
curl -X POST 'https://truecrew-dashboard.vercel.app/api/chief/governed-slack-notify' \
  -H 'Content-Type: application/json' \
  -H 'x-internal-key: YOUR_INTERNAL_API_SECRET' \
  -d '{
    "event": "monitor_state",
    "state": "healthy",
    "probeId": "vercel+supabase"
  }'
```

→ `{"ok":true}` (if auth OK)
Slack: `Monitor state: healthy (probe=vercel+supabase, incident=none).`

`YOUR_INTERNAL_API_SECRET` = Vercel env `INTERNAL_API_SECRET` (must match the client `VITE_INTERNAL_KEY` baked into the bundle).

### Manual validation

Assumes live API + auth configured. Open [https://truecrew-dashboard.vercel.app](https://truecrew-dashboard.vercel.app) and confirm Settings shows Supabase connected.

1. **Approval created + updated (handoff)** — Builds → pick a workflow → Propose handoff. Slack: `Chief approval created: apr-research-psh-… (research:project-summary-handoff) for incident n/a.` Approve the card in Chief → Slack: `Chief approval updated: … is approved (kind=research:project-summary-handoff, incident=n/a).` UI: execution line on the card shows mission `running` → `completed` / `failed` / `blocked`.
2. **Approval created + updated (postmortem)** — Monitor → active incident → Propose postmortem. Slack: `Chief approval created: … (research:monitor-incident-postmortem) for incident <incidentId>.` Approve in Chief → Slack: `Chief approval updated: … is approved (kind=research:monitor-incident-postmortem, incident=<incidentId>).`
3. **Mission status changes** — after approving handoff or postmortem (vault + Supabase + LLM must be configured): Slack (`running`): `Governed mission psh-… status: running (approval=…, result=none).` Slack (terminal): `… status: completed` with `result=<vault note path>` — or `failed` / `blocked` with `result=none`.
4. **Monitor state changes** — load Chief/Today with live API (monitor polls every ~45s). On first settled tone (skips `loading`), Slack: e.g. `Monitor state: healthy (probe=vercel+supabase, incident=none).` If a probe fails: `Monitor state: degraded (probe=vercel, incident=none).` (or `vercel+supabase`). A monitor platform approval card appearing also fires approval-created once per degradation session.
5. **UI cross-check** — on each step, verify Chief approval cards and Today's mission strip match Slack (same approval IDs, mission status, result links on completion). Slack is observability only; the UI remains source of truth for operator action.

### Failure behavior

| Condition | Behavior | User impact |
|-----------|----------|-------------|
| `SLACK_WEBHOOK_URL` unset | `governedLoopSlack` returns immediately (no-op) | None — approvals/missions/monitor unchanged |
| Webhook POST fails (network, 4xx/5xx) | `console.warn` only; no throw | None — HTTP responses still succeed |
| Client notify fetch fails | `console.warn` in `governedSlackNotify.ts`; `.catch` swallows | None — approval enqueue/decision not blocked |
| Server schedule helpers | `void governedLoopSlack(…)` — fire-and-forget | Slack failure never blocks API response |
