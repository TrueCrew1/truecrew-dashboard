# True Crew Executive Dashboard — Overview Workspace

**Route:** `/dashboard` · **Persona:** Founder (primary), Operator (read-only subset)  
**Version:** 1.0 · **Status:** Design spec

---

## 1. Page purpose

The Executive Dashboard is the **founder operating cockpit** — not a marketing page, not a BI wall of charts. A founder should answer these questions in **under 5 seconds**:

| Question | Where answered |
|----------|----------------|
| Are we healthy right now? | Top strip posture (Red / Amber / Green) |
| What needs my attention? | Action queue (left, primary) |
| Who is available vs blocked? | Capacity strip + blocked-work panel |
| Is revenue at risk? | Revenue & customer panel + revenue-path KPI |
| What is ops exposure? | Ops posture panel (services, incidents, deploy path) |

**Relationship to other workspaces**

| Workspace | Role |
|-----------|------|
| **Today** (`/`) | Tactical execution — focus queue, blocking gates, Sev 1–2 list |
| **Overview** (`/dashboard`) | Strategic situational awareness — connects revenue, ops, and risk |
| **Monitor / Repair** | Deep incident and service drill-down |
| **Customers** | Account-level detail |

Overview **surfaces and prioritizes**; Today **executes**. Clicking an action-queue item opens the context rail and/or navigates to the owning workspace.

---

## 2. Layout zones

Single scroll page. No tabs. No decorative charts. Dense but scannable.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOP STRIP — Business posture · last refresh · posture reason (1 line)       │
├─────────────────────────────────────────────────────────────────────────────┤
│ KPI STRIP — 5 tiles: Risk · Revenue path · Ops health · Blocked · Available │
├──────────────────────────────┬──────────────────────┬───────────────────────┤
│ ACTION QUEUE (primary)       │ OPS POSTURE          │ REVENUE & CUSTOMERS   │
│ Max 7 items, sorted          │ Service health rows  │ Active / onboarding   │
│ Founder-attention only       │ Open incidents       │ At-risk accounts      │
│                              │ Deploy pipeline      │ Enterprise blockers   │
├──────────────────────────────┴──────────────────────┴───────────────────────┤
│ TREND CARDS — 4 compact 7-day directional indicators (not full charts)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Top strip

- **Posture badge:** `RED` · `AMBER` · `GREEN` (large, single word)
- **Reason line:** One sentence derived from highest-severity trigger (see §4)
- **Meta:** `Last updated · 2m ago` · data source badge (`Live` / `Mock`)
- **No buttons** except optional `↻ Refresh` — actions live in the queue

### KPI strip (5 tiles)

Fixed order left → right. Each tile: **label · value · status dot · one-line context**. No sparklines in v1.

| # | Tile | Maps to entity |
|---|------|----------------|
| 1 | Open risk | `incidents` (Sev 1–2, unresolved) |
| 2 | Revenue path | `deploys` + `tasks` on revenue-critical services |
| 3 | Ops health | `tools` in production |
| 4 | Blocked | `tasks` in Waiting or gate-blocked |
| 5 | Available | Derived from `tasks.assignee` load |

### Main panels (3 columns ≥ 1200px; stack on narrow)

**Action queue (40% width)** — See §5.

**Ops posture (30%)**

- **Service rows:** Production services only; icon + name + status pill + open incident count
- **Active incidents:** Unresolved, top 3 by severity then age
- **Deploy pipeline:** Builds/deploys not in `Done`/`Logged` on production path

**Revenue & customers (30%)**

- **Active accounts:** Count by tier (enterprise / growth / starter)
- **Onboarding in flight:** Accounts in `onboarding` with checklist % complete
- **At-risk:** Active customers with `healthScore < 70` or linked open ticket

### Trend cards (bottom row, 4 cards)

Compact **direction + delta** only — e.g. `↓ 1` `→ 0` `↑ 2`. No axes, no legends.

| Card | Metric | Window |
|------|--------|--------|
| Sev 1–2 open | Count vs 7 days ago | 7d |
| Gate-blocked items | Count of tasks with failed required gates | 7d |
| Avg customer health | Mean `healthScore` of active customers | 7d |
| Production deploys | Deploys reaching `Logged` with `healthCheckPassed` | 7d |

---

## 3. KPI definitions and why they matter

### 3.1 Open risk

**Definition:** Count of incidents where `status ∉ { resolved, post_mortem_filed }` AND `severity ≤ 2`.

**Context line:** Highest open severity + service name — e.g. `Sev 2 · Auth Service`.

**Why it matters:** Customer-facing outages and security events are the fastest path to churn and reputational damage. Founders need this number visible before MRR.

---

### 3.2 Revenue path

**Definition:** Count of **blockers** on the path to shipping revenue-impacting work:

1. Production `deploys` where `stage ∉ { Done, Logged }` AND linked service has tag `revenue-critical`
2. Plus `tasks` on revenue-critical services in `In Progress` or `Review` with any **required gate failed**

**Context line:** Nearest blocker — e.g. `Deploy blocked · PR gate`.

**Why it matters:** Revenue is not an abstract KPI — it is **shipped, healthy services**. This ties pipeline state to money.

---

### 3.3 Ops health

**Definition:** Ratio displayed as `healthy / total` for production `tools`.

**Context line:** Degraded or down service names (max 2, then `+N`).

**Why it matters:** Shows platform stability without opening Monitor. Degraded revenue-critical services escalate posture to Amber automatically.

---

### 3.4 Blocked

**Definition:** Count of:

- `tasks` in `Waiting` with non-empty `blocker`, OR
- `tasks` in `In Progress`, `Review`, or `Planned` with any **required gate** where `passed === false`

**Context line:** Top blocker text truncated — e.g. `Legal review pending`.

**Why it matters:** Blocked work is invisible throughput loss. Surfaces external dependencies (legal, customer, CI) before they stall revenue path.

---

### 3.5 Available capacity

**Definition:** Personas (`founder`, `operator`) with **fewer than 2** tasks in `In Progress` and **zero** assigned Sev 1–2 incident ownership.

**Display:** `Founder · Operator` with status per persona:

| Status | Meaning |
|--------|---------|
| **Available** | < 2 in-progress tasks, no active Sev 1–2 assignment |
| **Loaded** | 2+ in-progress tasks OR one Sev 2+ incident |
| **Blocked** | Has assigned task in `Waiting` with `blocker` set |

**Why it matters:** Small teams win by knowing who can take the next item **before** something catches fire.

---

## 4. Alert logic (Red / Amber / Green)

Posture is **worst-wins** — evaluate Red first, then Amber; else Green.

### RED — act now

| Trigger | Source |
|---------|--------|
| Any open **Sev 1** incident | `incidents.severity === 1` |
| Sev 2 open **> 4 hours** without `status === mitigating` | `incidents` + `openedAt` |
| Any production service **`down`** with tag `revenue-critical` | `tools.status === 'down'` |
| Enterprise customer **`healthScore < 60`** and `status === 'active'` | `customers` |
| Critical task in **Review** overdue **> 48h** (`dueAt` passed) | `tasks` |

**Reason line examples:**

- `Sev 1 — Billing API checkout failures`
- `Revenue-critical service down — Billing API`
- `Enterprise account at risk — Acme Corp health 58`

---

### AMBER — watch closely

| Trigger | Source |
|---------|--------|
| Sev 2 **mitigating** OR Sev 3 open **> 24h** | `incidents` |
| Any production service **`degraded`** (revenue-critical) | `tools` |
| Production deploy blocked **> 24h** (failed gate on deploy workflow) | `deploys` + gates |
| Onboarding **Waiting > 72h** with incomplete required checklist | `customers` + `tasks` |
| **> 3** gate-blocked tasks across the org | `tasks.gates` |
| Both personas **Loaded or Blocked** (no one Available) | capacity calc |

**Reason line examples:**

- `Sev 2 mitigating — Auth Service latency`
- `Deploy blocked 36h — Billing API v2.4.1`
- `Onboarding stalled — Acme Corp (3d waiting)`

---

### GREEN — steady

All of:

- No open Sev 1–2
- No revenue-critical service `down` or `degraded`
- No enterprise customer `healthScore < 70`
- ≤ 2 gate-blocked tasks
- At least one persona **Available**

**Reason line:** `All systems steady · 1 operator available`

---

### KPI tile status dots

Each KPI tile inherits its own dot independent of global posture:

| Dot | Rule |
|-----|------|
| Red | KPI-specific threshold breached (e.g. Open risk ≥ 1 Sev 1–2) |
| Amber | KPI elevated but below Red (e.g. only Sev 3, or 1 degraded non-critical service) |
| Green | KPI within normal bounds |

---

## 5. Action queue structure

### What gets shown

Only items requiring **founder judgment or unblock**. Max **7** rows.

| Priority tier | Item type | Inclusion rule |
|---------------|-----------|----------------|
| P0 | Active incident | Sev 1–2, not resolved |
| P1 | Critical decision | `workflowType === 'decision'` AND `priority === 'critical'` in `Review` |
| P2 | Revenue-path blocker | Failed gate on revenue-critical deploy OR build blocking production deploy |
| P3 | Enterprise onboarding stall | Enterprise tier + `Waiting` + required checklist incomplete + age > 48h |
| P4 | High gate block | `priority === 'high'` + failed required gate in `In Progress` or `Review` |
| P5 | Customer ticket | Active customer linked ticket in `Triage` or `Inbox` with `priority >= high` |

**Excluded from Overview queue** (shown on Today instead): low-priority inbox items, Logged/Done work, internal non-blocking tasks.

### Row format

```
[Sev/Priority pill]  Title                          Owner    Age
                     One-line reason (blocker/gate)
```

Example:

```
[Sev 2]  Auth p99 latency spike          operator  8h
         Fix gate open — staging deploy pending
```

### Sort order

1. **Tier** (P0 → P5)
2. **Severity / priority** (Sev 1 > Sev 2 > critical > high)
3. **Revenue impact** (revenue-critical tag or enterprise customer linked → first)
4. **Age** (oldest `updatedAt` first)
5. **Due date** (overdue `dueAt` before non-overdue)

Footer link: **`View all in Today →`** (`/`)

---

## 6. Drill-down rules

All clickable rows/widgets open the **context rail** with the entity loaded. Secondary navigation where noted.

| Widget | Click target | Context rail | Route (optional) |
|--------|--------------|--------------|------------------|
| Posture badge | Highest-severity alert | Top alert entity | `/monitor` if incident-led |
| KPI: Open risk | KPI tile | Highest Sev open incident | `/monitor` |
| KPI: Revenue path | KPI tile | Top revenue-path blocker (deploy or task) | `/builds` or `/operations` |
| KPI: Ops health | KPI tile | First degraded/down service | `/monitor` |
| KPI: Blocked | KPI tile | Oldest blocked task | `/operations` |
| KPI: Available | Persona name | That persona's in-progress tasks | `/operations?assignee=` |
| Action queue row | Row | Linked task / incident / deploy / customer | By `workflowType` |
| Service row (Ops) | Row | `Tool` entity | `/monitor` |
| Incident row (Ops) | Row | `Incident` entity | `/repair` |
| Deploy row (Ops) | Row | `Deploy` entity | `/builds` |
| Customer row (Revenue) | Row | `Customer` entity | `/customers` |
| Trend card | Card | Filtered list for that metric | Matching workspace |

**Context rail sections** (when opened from Overview):

1. Entity summary + stage/status badges
2. Failed gates (if any) with pass/fail list
3. Linked entities (service, customer, deploy)
4. Primary action: `Open in [Workspace] →`

**Do not** open modals or new tabs from Overview in v1 — rail + route only.

---

## 7. Empty states

Each zone handles zero-data gracefully. Copy is operational, not cheerful.

| Zone | Condition | Display |
|------|-----------|---------|
| **Top strip** | Green posture, empty queue | Posture `GREEN` · `All systems steady` |
| **Action queue** | No P0–P5 items | `No founder actions queued.` · link to Today for operator work |
| **Ops: incidents** | No open incidents | `No open incidents.` (steel text, no icon parade) |
| **Ops: services** | All healthy | All rows green · context `4/4 healthy` |
| **Ops: deploys** | No in-flight production deploys | `No production deploys in pipeline.` |
| **Revenue: at-risk** | No customers below threshold | `No at-risk accounts.` |
| **Revenue: onboarding** | No onboarding accounts | Section hidden (not empty box) |
| **Trend cards** | Insufficient history (< 7d data) | `—` delta · `Baseline building` |
| **Full page** | Mock mode, no live API | Banner: `Mock data · Connect Supabase for live posture` |

Never show placeholder charts or lorem ipsum.

---

## 8. Example data (realistic usage)

Derived from current seed data — demonstrates **AMBER** posture.

### Computed posture: **AMBER**

**Reason:** `Sev 2 mitigating — Auth Service · Deploy blocked — Billing API v2.4.1`

---

### KPI strip

| KPI | Value | Dot | Context |
|-----|-------|-----|---------|
| Open risk | 1 | Amber | Sev 2 · Auth Service |
| Revenue path | 2 | Amber | PR gate · deploy blocked |
| Ops health | 2/4 | Amber | Auth · Webhook degraded |
| Blocked | 4 | Amber | Legal review pending |
| Available | 1/2 | Amber | Founder loaded · Operator blocked |

---

### Action queue (5 of 7 slots)

| # | Item | Reason |
|---|------|--------|
| 1 | **Auth p99 latency spike** · Sev 2 | Fix gate open — staging deploy pending |
| 2 | **Q3 pricing model decision** · Critical | Decision gate open — blocks Q3 roadmap |
| 3 | **Billing API v2.4.1 deploy** · Deploy | Build review gate — source not Done |
| 4 | **Acme Corp onboarding** · Enterprise | Waiting 3d — legal review pending |
| 5 | **Dashboard timeout — Northwind** · High | Triage gate — category unassigned |

---

### Ops posture panel

**Services (production)**

| Service | Status | Incidents |
|---------|--------|-----------|
| Billing API | healthy | — |
| Auth Service | degraded | 1 open |
| Webhook Worker | degraded | 1 open |
| Command Center | healthy | — |

**Active incidents**

| Incident | Sev | Status |
|----------|-----|--------|
| Auth p99 latency spike | 2 | mitigating |
| Webhook delivery backlog | 3 | open |

**Deploy pipeline**

| Deploy | Stage | Blocker |
|--------|-------|---------|
| Billing API v2.4.1 → Production | Planned | Source build not Done |

---

### Revenue & customers panel

| Segment | Count | Note |
|---------|-------|------|
| Active | 2 | 0 enterprise active yet |
| Onboarding | 1 | Acme Corp · checklist 1/3 |
| At-risk | 0 | — |

**Enterprise blocker:** Acme Corp — tenant not provisioned; legal review external.

---

### Capacity

| Persona | Status | Load |
|---------|--------|------|
| Founder | Loaded | 2 in progress (rate limiter, pricing decision) + Sev 2 oversight |
| Operator | Blocked | Acme onboarding waiting on legal |

---

### Trend cards (7d)

| Card | Now | Δ7d | Direction |
|------|-----|-----|-----------|
| Sev 1–2 open | 1 | +1 | ↑ |
| Gate-blocked | 4 | +2 | ↑ |
| Avg customer health | 85 | −3 | ↓ |
| Production deploys | 1 | → | → |

---

## Implementation notes

- **Data source:** Compose from existing `useData()` payload — no new tables required for v1; add computed selectors in `lib/dashboard/` or similar.
- **Do not duplicate Today:** Overview queue is founder-filtered and capped; Today remains the full execution list.
- **No generic charts:** Trend cards are computed deltas only until real time-series exists in Supabase.
- **Brand:** Use existing posture colors — Red (`--red`), Amber (`--yellow`), Green (`--green`); KPI strip uses `--brand-accent-bar` top rule only.

---

## Out of scope (v1)

- MRR/ARR dollar amounts (no billing integration yet)
- Sparklines and chart libraries
- Customizable widget layout
- Observer persona write actions
- Historical posture timeline
