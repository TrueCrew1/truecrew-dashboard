# Agent Capabilities Summary

Short operational reference for what each agent lane can do in V1. For truth status and evidence, see [V1 Truth Map](./V1_TRUTH_MAP.md).

## Approved Project Summary → Build Handoff

- **Trigger:** Build proposal → Chief approval
- **Execution:** live Research mission with Supabase workflow context + LLM output
- **Outputs:** handoff note, artifact JSON, mission JSON, Build Log append
- **Status:** truthful mission state visible in Builds and Chief → Agents

## Monitor Incident → Research Postmortem

- **Trigger:** Active incident on Monitor → Research postmortem approval (`research:monitor-incident-postmortem`)
- **Execution:** live Research mission loads incident from Supabase, calls LLM, writes postmortem note + artifact JSON + mission record + Build Log
- **Outputs:** `Operations/Handoffs/Monitor Incident Postmortem — <title>.md`, artifact JSON, mission JSON under `Operations/Missions/monitor-incident-postmortem/`
- **Status:** same execution feedback, approval activity, and result-link surfaces as handoff missions

Mission activity and status is visible on Today/Home (`AgentMissionsCard`) and in Chief’s Agent status strip (`AgentStatusStrip` on the Chief home panel). Chief’s situation brief derives platform health from the same `useMonitorHealth` hook as Monitor (`deriveChiefSituationBriefFromMonitor`). Live monitor probe failures enqueue a governed approval card in Chief’s approvals lane (`deriveMonitorApprovalCards`). Chief approval decisions write durable activity records (vault JSON + decision note) in live mode via `ChiefApprovalsContext.recordDecision` and `GET /api/chief/approval-activity`. Approval cards show post-decision execution feedback (`deriveApprovalExecutionFeedback`) so operators can see whether an approval launched a mission and its current status without leaving the card.

### Chief agent status strip

Surfaces four core agents at a glance on Today’s Chief panel:

- **Research** — handoff mission hook (`useProjectSummaryHandoffMissions`). **Healthy:** idle or completed missions. **Degraded:** running/queued handoffs or blocked/failed missions. **Not started / Not live:** mock mode or mission fetch unavailable.
- **Build** — build-gate tasks and pending Build approval cards. **Healthy:** configured approval path or pending build approvals. **Degraded:** build tasks blocked on open gates. **Configured** label when idle but approval path is wired (no autonomous build runner).
- **Librarian** — `deriveLibrarianAgentWorkItems` from tasks + Obsidian notes. **Healthy:** active or completed filing candidates. **Degraded:** blocked filing candidates. **Not started / Not live:** no candidates or mock mode.
- **Monitor** — `useMonitorHealth` Vercel + Supabase probes (same as Monitor page). **Healthy:** probes OK. **Degraded:** probe errors or unreachable DB. **Config only / Not live:** mock mode or probes not yet loaded.

### Monitor → Chief situation brief

Chief’s situation brief (`ChiefSituationBrief` on Today and Chief panel) summarizes the same monitor probes:

- **Healthy** — both Vercel and Supabase probes report OK.
- **Degraded** — one or both probes report errors (Vercel deploy failure, Supabase unreachable, missing monitor env).
- **Loading / unavailable** — probes still running or returned no confirmable signal.
- **Mock / config-only** — live API off; brief never claims platform health.

### Monitor → Chief approval card

When live probes report a real platform issue, Chief surfaces one deduped approval card (`deriveMonitorApprovalCards`, stable id `MONITOR_PLATFORM_APPROVAL_ID`) in the existing approvals lane. The card clears when probes return healthy; operator decisions persist via the normal Chief approval flow. No card in mock mode or while probes are loading/unconfirmed.

### Chief approval activity persistence

- **Live mode:** operator decisions on real approval cards persist to Supabase (`chief_approval_decisions`) and append a vault activity JSON record under `Operations/Approvals/activity/<proposalId>.json` plus a decision note via `logDecision()`. Activity records are readable via `GET /api/chief/approval-activity`.
- **Mock mode:** session-only activity rows in `ChiefApprovalsContext` for the current browser session; labeled honestly — no fake durable history.
- **Scope:** all cards routed through `ChiefApprovalsContext.recordDecision`, including project-summary handoff and monitor platform approvals.
- **Today:** `ApprovalActivityCard` on Today lists recent governed approval activity (handoff, postmortem, monitor platform) with status and a **View in Chief** deep link (`?chiefApproval=<proposalId>`) that opens the Chief Approvals tab and focuses the matching card.

### Approval execution feedback (Chief cards)

After a decision, each approval card shows a compact execution line derived from real mission state — queued, running, completed, blocked, failed, launch failure, or no mission launched. Project-summary handoff and monitor-incident postmortem approvals launch the real Research mission on approve; monitor platform approvals explicitly show informational-only / no mission launched. Mock mode labels mission launch as unavailable. When missions finish, approval cards show real vault output refs (mission record, note, artifact JSON, Build Log) from mission data — only paths that exist on the record.
