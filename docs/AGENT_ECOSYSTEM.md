# Agent Ecosystem

**Locked roster and supervisor pattern for True Crew's multi-agent system.**

True Crew is a premium SaaS **operations and maintenance command center** for supervisors
and field operators. This document is the canonical agent map. It does not replace
[AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) (operating laws) or
[AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md) (Chief approval mechanics). For
foreman architecture see [adr/0001-chief-foreman-architecture.md](adr/0001-chief-foreman-architecture.md).

---

## Supervisor pattern

**Chief is the single front-facing foreman and supervisor.** Operators never get approval
asks, status routing, or escalation decisions from specialists directly — only from Chief.
All other agents are **bounded specialists**: they read narrow inputs, produce artifacts or
status signals, and route gated work through Chief — never around it.

The **runtime** (when built) coordinates specialist jobs, enforces containment, and
delivers durable outputs to the correct sinks. Chief holds the approval queue; the runtime
holds execution policy. See [RUNTIME_GOVERNANCE.md](RUNTIME_GOVERNANCE.md).

```
Operator ↔ Chief (foreman) ↔ Runtime ↔ Specialists → Sinks (Obsidian / repo / Notion / Slack)
```

---

## Agent roster

**Twelve roles — locked.** Chief (foreman) + eleven specialists. No ad hoc agents.

| Role | Status (today) |
|------|----------------|
| Chief (foreman / supervisor) | existing |
| Build Agent | partial |
| Research Agent | partial |
| Workflow Gate Agent | partial |
| Maintenance Agent | missing |
| Monitoring / Triage Agent | partial |
| Librarian / Obsidian Agent | partial |
| Repo Scribe Agent | partial |
| Notion Clerk / Ops Sync Agent | missing |
| Scout (Slack bot) | missing |
| Cloud / File Steward | missing |
| Governance Agent | partial |

Status key: **existing** = wired in product or server code today; **partial** = stub,
mock, or docs-only lane; **missing** = defined here, not yet implemented.

---

### Chief (foreman / supervisor)

| Field | Detail |
|-------|--------|
| **Role** | Single supervisor: routes operator questions, surfaces risk, holds the approval queue, attributes specialist work. Does not execute irreversible actions. |
| **Triggers** | Manual (operator command, Approvals tab, Board actions); reactive (dashboard data load derives board items and approval candidates). |
| **Inputs** | Dashboard data (tasks, incidents, alerts, deploys, customers); merged approval proposals; operator natural-language commands. |
| **Outputs** | Advisory responses; board lanes; approval cards; command history; governance event emissions (session). |
| **Delivery sinks** | In-app Chief UI; decision persistence via `/api/chief/approvals` → Supabase `chief_approval_decisions`. |
| **Status** | **existing** — `src/components/chief/` |

---

### Build Agent

| Field | Detail |
|-------|--------|
| **Role** | Implements bounded code/config changes; opens PRs; proposes merge- and migration-gated work through Chief. |
| **Triggers** | Manual (Builds page QA trigger, external Build lane in Cursor/Claude); reactive (live task/gate state → Agents tab rows). |
| **Inputs** | Build tasks and gates; `APPROVAL_GATES.build`; PR/branch context; operator-approved specs. |
| **Outputs** | PRs, branches, approval requests (`BuildApprovalRequest` → Chief card); live Agents-tab work items. |
| **Delivery sinks** | Repo (code, ADRs, specs); Obsidian via `npm run obsidian:log` after merge; Chief Approvals. |
| **Status** | **partial** — approval loop validated; no autonomous build runner in-app. Gate role: `build` in `agentApprovalGates.ts`. |

---

### Research Agent

| Field | Detail |
|-------|--------|
| **Role** | Investigates incidents, evaluates tools/vendors, produces research memos and triage briefs. Proposes adoption decisions through Chief. |
| **Triggers** | Manual (Monitor page QA trigger); reactive (active incidents → Agents tab rows and incident-repair proposals). |
| **Inputs** | Incidents, alerts, monitor signals; `APPROVAL_GATES.research`; external research lanes. |
| **Outputs** | Research scratchpads; approval requests (`ResearchApprovalRequest`); incident triage recommendations. |
| **Delivery sinks** | Obsidian (research notes, incident briefs); repo (postmortems, ADRs); Chief Approvals. |
| **Status** | **partial** — approval loop validated; no automated investigation runner. Gate role: `research`. |

---

### Workflow Gate Agent

| Field | Detail |
|-------|--------|
| **Role** | Tracks required gates, CI/PR linkage, and blockers on open work. Surfaces gate overrides and deploy holds for operator approval. |
| **Triggers** | Reactive (task gate state, GitHub webhook gate pass/fail, ops-derived approval candidates). |
| **Inputs** | Task `gates` and `blocker` fields; GitHub `pull_request` / `check_run` / `check_suite` webhooks; deploy holds. |
| **Outputs** | Gate status on tasks; `audit_events` from webhook handler; gate-override approval proposals; Agents-tab rows. |
| **Delivery sinks** | Supabase (`audit_events`, task gate columns); Chief Board/Approvals; repo runbooks for gate definitions. |
| **Status** | **partial** — live-derived UI + GitHub webhook automation; no dedicated gate-agent service. |

---

### Maintenance Agent

| Field | Detail |
|-------|--------|
| **Role** | Owns preventive maintenance (PM) backlog, due/overdue PM signals, and work-order follow-through so supervisors know what field crews must do next. |
| **Triggers** | Scheduled (PM due scans — planned); reactive (overdue PM signals, work-order status changes). |
| **Inputs** | Work orders, PM schedules, asset/site context; Today page read model (`/api/today/work-orders`). |
| **Outputs** | Maintenance items, schedule updates, operator summaries, escalation proposals. |
| **Delivery sinks** | Notion (maintenance backlog); Obsidian (maintenance logs); repo (PM runbooks); Chief for gated schedule changes. |
| **Status** | **missing** — Today/work-orders scaffold exists; no Maintenance Agent process or roster wiring yet. |

---

### Monitoring / Triage Agent

| Field | Detail |
|-------|--------|
| **Role** | Watches platform and service health; correlates alerts with incidents; proposes triage and repair workflows. |
| **Triggers** | Scheduled (health poll — 45s client interval when live API on); reactive (alert feed, Sev 1–2 incidents). |
| **Inputs** | `/api/monitor/vercel`, `/api/monitor/supabase`; dashboard alerts and incidents; `monitor_supabase_health` RPC. |
| **Outputs** | Health snapshots; triage summaries; incident-repair approval proposals (via Chief derivation). |
| **Delivery sinks** | Monitor page UI; Obsidian incident notes; Notion incident tracker (planned); Slack alerts via Scout (planned). |
| **Status** | **partial** — Monitor APIs and UI exist; no dedicated triage agent runner or Slack delivery. |

---

### Librarian / Obsidian Agent

| Field | Detail |
|-------|--------|
| **Role** | Indexes, retrieves, and files **operational memory** — shift handoffs, runbooks, PM notes, incident scratchpads — in Obsidian for field and supervisor use. |
| **Triggers** | Manual (Chief knowledge commands); reactive (vault note requests via API). |
| **Inputs** | Mock runbooks/prompts/notes (today); `/api/obsidian/notes` (read); Obsidian vault path. |
| **Outputs** | Knowledge search results; filed notes; vault index updates. |
| **Delivery sinks** | Obsidian vault (primary); repo `docs/vault-templates/` (seed source). |
| **Status** | **partial** — regex search over mock data + read-only Obsidian API; `npm run obsidian:log` is manual CLI, not agent-driven. |

---

### Repo Scribe Agent

| Field | Detail |
|-------|--------|
| **Role** | Writes and maintains durable engineering artifacts in the repo — ADRs, specs, runbooks, release notes, integration docs. |
| **Triggers** | Manual (post-approval, post-merge); reactive (PR merged → log prompt in workflow docs). |
| **Inputs** | Approved decisions; PR metadata; operator rationale; `docs/` and `docs/decisions/` conventions. |
| **Outputs** | Markdown commits; ADR files; changelog entries; PR-linked documentation. |
| **Delivery sinks** | Repo markdown (primary); Obsidian decision mirrors via `obsidian:log`. |
| **Status** | **partial** — human/agent workflow documented in `AGENT_WORKFLOW.md`; no automated scribe service. |

---

### Notion Clerk / Ops Sync Agent

| Field | Detail |
|-------|--------|
| **Role** | Syncs shared ops workspace for supervisors and stakeholders — maintenance backlog, incident tracker, task boards, status dashboards — without duplicating engineering truth in the repo. |
| **Triggers** | Scheduled (sync jobs — planned); reactive (status change, incident open/close). |
| **Inputs** | Chief decisions; work-order and incident state; maintenance backlog deltas. |
| **Outputs** | Notion page/database updates; status dashboard refreshes. |
| **Delivery sinks** | Notion (primary); links back to Obsidian notes and repo ADRs. |
| **Status** | **missing** — no Notion integration in repo today. |

---

### Scout (Slack bot)

| Field | Detail |
|-------|--------|
| **Role** | **Slack delivery bot** — pushes alerts, digests, and shift summaries to operators in the field. Not archival; not an approval surface. |
| **Triggers** | Reactive (alert fired, approval overdue, incident escalated — planned); scheduled (daily/shift digest — planned); manual (operator `@scout` query in Slack). |
| **Inputs** | Chief situation brief signals; monitor health; pending approval counts; Maintenance/Monitoring summaries. |
| **Outputs** | Slack messages, threads, ephemeral summaries. Every output that matters must be mirrored to a durable sink. |
| **Delivery sinks** | Slack only (transient). Obsidian, repo, or Notion hold the record ([SYSTEM_OF_RECORD.md](SYSTEM_OF_RECORD.md)). |
| **Status** | **missing** — no Slack integration in repo. *(Separate: "Scout lane" in `EXECUTION_KIT.md` is a Continue read-only dev tool — not this bot.)* |

---

### Cloud / File Steward

| Field | Detail |
|-------|--------|
| **Role** | Keeps deploy artifacts, env-scoped config, and file storage hygienic — secrets out of sinks/repos, preview vs production clearly tagged — so ops automation does not leak into the wrong environment. |
| **Triggers** | Manual (deploy, promote); reactive (webhook deploy events — planned). |
| **Inputs** | Vercel/Netlify deploy context; env var inventory; blob/storage paths. |
| **Outputs** | Deploy confirmations; storage cleanup logs; env audit notes. |
| **Delivery sinks** | Repo ops docs; Obsidian deploy log; platform dashboards. |
| **Status** | **missing** — deploy docs exist (`DEPLOY_NOW.md`); no steward agent or automation. |

---

### Governance Agent

| Field | Detail |
|-------|--------|
| **Role** | Enforces runtime policy checks (containment, approval gates, sink routing) and maintains audit completeness. Observability-only today; enforcement planned with runtime. |
| **Triggers** | Reactive (proposal created, decision recorded, webhook processed); scheduled (audit completeness scan — planned). |
| **Inputs** | Governance events (`chiefGovernanceEvents.ts`); `audit_events`; `chief_approval_decisions`; `APPROVAL_GATES`. |
| **Outputs** | Audit log entries; governance panel events (dev); policy violation escalations to Chief. |
| **Delivery sinks** | Supabase audit tables; Obsidian decision log; repo ADRs for policy changes. |
| **Status** | **partial** — ADR-001 auditor system (client + server tiers); no enforcement agent or unified audit API. See [decisions/ADR-001-auditor-system.md](decisions/ADR-001-auditor-system.md). |

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [SYSTEM_OF_RECORD.md](SYSTEM_OF_RECORD.md) | Where artifacts must land |
| [MODEL_ROUTING_POLICY.md](MODEL_ROUTING_POLICY.md) | Cheap-first AI tiers |
| [RUNTIME_GOVERNANCE.md](RUNTIME_GOVERNANCE.md) | Containment, policy, audit |
| [CHANGE_CONTROL.md](CHANGE_CONTROL.md) | In-scope work and change process |
| [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) | Constitutional laws and session prompts |
| [AGENT_RUNTIME_GOVERNANCE.md](AGENT_RUNTIME_GOVERNANCE.md) | Chief-specific runtime invariants (INV-1–7) |
