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
- **Visibility:** Decisions persist to vault activity JSON in live mode; execution feedback appears on approval cards. Today approval-activity UI is deferred.

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

- Scope is limited to these loops. V1 does not include Slack/voice integrations, a generic mission framework, or background retries/queues.
- Mock mode is honest: no fake mission completions, no fabricated durable history, and no placeholder artifact paths.
