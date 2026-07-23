# Chief Interface v1 — Main Dashboard Spec

Spec only. No UI code changes in this document’s accompanying PR.
Implements later against existing surfaces: `TodayPage` (`/`), `ChiefHomePanel`,
`ChiefPanel` (app-shell sidebar), and shared `ChiefApprovalsContext`.

**Related (do not replace):** `docs/CHIEF_VOICE_AND_COMMAND_SPEC.md` (voice → text
intake), `docs/AGENTS_BOARD.md` (Agents tab data), `docs/AGENT_APPROVAL_LOOPS.md`,
`docs/AGENT_RUNBOOK.md`, `docs/internal/tool-model-routing-standard.md` (Ollama default).

**Current baseline (read from code, Jul 2026):**

| Surface | Role today |
|---|---|
| `AppShell` | Left nav (`Sidebar`), top bar, main `Outlet`, persistent right `ChiefPanel`, optional `ContextRail` |
| `/` `TodayPage` | Primary home: shift stats, `ChiefHomePanel`, focus queue, incidents, blocking gates |
| `/dashboard` `DashboardPage` | Ops snapshot (tasks / pipeline / deploys) — no Chief home panel |
| `ChiefHomePanel` | Situation brief + text “Ask Chief” + approval/blocked snapshots |
| `ChiefPanel` | Tabs: Command, Board, Agents, Approvals, History (+ Dev in local builds) |
| Command path | Text → `resolveChiefCommand()` (client router); no speak/transcribe UI yet |
| Approvals API | `GET`/`POST` `/api/chief/approvals` (Supabase-backed decisions) |

---

### Purpose

The main page (`/` Today, evolving toward a dedicated Chief command center) is
**Chief’s command center and verbal co‑founder interface**: the place the operator
opens to ask “what matters now,” hear/see a plain-language brief, review what needs
a human decision, and route work to specialists — without leaving the field-friendly
shell. In practice that means one primary interaction zone (chat + future voice),
tight approval visibility, live agent status, and ambient cosmic/techno styling that
still keeps thumb reach and contrast usable on phone or tablet.

---

### Core interactions

v1 must support these from the main Chief surface (Today home + persistent panel;
incremental slices OK):

- **Ask Chief (text)** — type a command; get summary, blockers, recommended action,
  and optional approval filing (same contract as today’s `resolveChiefCommand`).
- **Speak / transcribe (voice intake)** — mic → STT → same command router as text
  (per `CHIEF_VOICE_AND_COMMAND_SPEC.md`). No spoken approve/merge/deploy.
- **Situation / day summary** — at-a-glance brief: at risk, blocked, pending
  approvals, platform health signals already used by `ChiefSituationBrief`.
- **Show and decide approvals** — pending queue visible on home; full Approve /
  Send back / Reject only via existing card actions (never auto-execute).
- **Route work to specialists** — propose/route to Librarian and Research (and other
  live agents) through the shared approval queue / Agents board — not direct agent chat.
- **Agent status glance** — what Build, Workflow Gate, Research, Librarian (and later
  Runtime Reviewer) are carrying: queued / active / blocked / awaiting approval.
- **Command history** — recent asks and outcomes for the session (existing History tab).
- **Jump into ops context** — from brief or board items into Focus / Monitor / Builds
  without breaking the Chief contract.

Out of scope for interface v1 (keep explicit): Slack intake, spoken approval
decisions, auto-merge/deploy, new parallel routers.

---

### Layout (futuristic / cosmic / techno)

Visual direction: deep space / techno — dark field, subtle starfield or nebula
gradient, cool cyan/steel accents, restrained glow. Usability first: readable type,
clear focus rings, no glow that washes contrast. Mobile: one primary zone above the
fold; secondary boards stack; persistent Chief panel may collapse to a launcher on
narrow widths (implementation detail, not a contract change).

Suggested hierarchy (redesignable presentation; stable zones):

- **Main Chief interaction zone (hero)**
  - Dominant center/upper area: conversation / command transcript.
  - Input row: text field + Run; mic control when voice slice lands.
  - Response card: Chief summary → recommended action → “needs approval” cue.
  - Ambient: soft radial glow behind the zone; light motion on processing
    (existing skeleton/pulse patterns), not decorative noise over content.

- **Approvals / boards strip**
  - Immediately below or beside the hero: “Needs approval” + “Blocked” snapshots
    (today’s `ChiefHomePanel` pattern), with deep-link into full Approvals / Board tabs.
  - Cards stay decision surfaces — not marketing tiles.

- **Agent status rail**
  - Compact live status for Librarian, Research, Build/Gate, and (when wired)
    Runtime Reviewer — reuse Agents-tab signals (`docs/AGENTS_BOARD.md`).
  - Prefer status chips / short lanes over dense tables on the home view.

- **Ops context (secondary)**
  - Existing Today panels (focus, incidents, gates) remain below the Chief zone so
    the page still answers “what do I do next” after the brief.

- **Shell chrome**
  - Keep app `Sidebar` + top bar; persistent `ChiefPanel` remains the full command
    layer (tabs). Home page is the co‑founder “stage”; sidebar panel is the always-on
    console.

- **Ambient / cosmic elements (allowed, constrained)**
  - Full-bleed subtle background (gradient + low-opacity star/grid texture).
  - Thin techno framing on the Chief zone only.
  - Motion: processing pulse, mic listening indicator, gentle lane count updates —
    2–3 intentional motions, not continuous particle spam.
  - Avoid purple-on-white defaults, heavy multi-shadow cards, and emoji decoration.

---

### Data and integrations

Surface these systems; prefer existing hooks/APIs before inventing new ones.

| System | What the page surfaces | Notes / current state |
|---|---|---|
| **Chief command (text)** | Ask → summary / action / approvalNeeded | Client `resolveChiefCommand()` today; future ask API must preserve the same response shape |
| **Chief speak / transcribe** | Mic → transcript → same ask path | Spec’d in `CHIEF_VOICE_AND_COMMAND_SPEC.md`; endpoints not shipped yet — add `ask` / `speak` / `transcribe` behind a thin adapter so UI does not hard-bind to STT vendor |
| **Chief approvals API** | Pending/decided cards; record decisions | `/api/chief/approvals` + `ChiefApprovalsContext` |
| **Supabase events / ops data** | Approvals, jobs/tasks, crews/customers, incidents, gates | Via `/api/data` + approvals tables; home panels already consume live/mock context |
| **Vercel deployment status** | Latest deploy health in situation brief | `useMonitorHealth()` → `/api/monitor/vercel` (already wired into `ChiefPanel` brief) |
| **Agent status — Librarian** | Artifact / note filing load | Live derivation in `deriveLibrarianAgentWorkItems` |
| **Agent status — Research** | Incident-driven research load | Live derivation in `deriveResearchAgentWorkItems` |
| **Agent status — Runtime Reviewer** | CI/review gate health for open PRs/jobs | **Not present in app yet** — reserve a status slot; wire when that agent/signal exists; until then show empty/“unwired” not fake data |
| **Governance / history** | Command history; optional Dev governance events | History tab live; Dev tab local-only |

Contract rule: UI may restyle freely; it must not invent a second approval model or a
voice-only execution path.

---

### Constraints

- **PR-only, least-privilege.** Chief proposes and routes; the operator decides via
  approval cards. No auto-merge, auto-deploy, or silent external messaging from this
  page. Matches `AGENT_RUNBOOK.md` / `AGENT_APPROVAL_LOOPS.md`.
- **Ollama by default.** Reasoning/routing stays on local Ollama per
  `docs/internal/tool-model-routing-standard.md`, with optional cloud escalation only
  when explicitly allowed — the UI must not assume a cloud LLM is always available
  (degraded: rule-based `resolveChiefCommand` still works).
- **Stable Chief contract, swappable chrome.** Presentation (cosmic/techno layout) must
  be redesignable without breaking:
  - command intake → `ChiefResponse`-compatible result,
  - shared approvals queue + three decision actions,
  - agent status as read-only signals into the same board.
  Prefer props/adapters and CSS zones over baking layout into the router.
- **Incremental delivery.** Suggested slices: (1) home layout/visual hierarchy on
  `ChiefHomePanel`/`TodayPage`, (2) voice mic → transcribe → existing router,
  (3) richer agent status strip, (4) ask/speak API adapter when backend lands.
- **Field usability.** Thumb-friendly controls, real empty/error states, contrast
  over glow. Cosmic atmosphere must not hide “what do I do next.”

---

### Implementation notes (non-binding)

- Prefer evolving `TodayPage` + `ChiefHomePanel` as the v1 stage; keep `ChiefPanel`
  as the full console rather than duplicating Approvals logic.
- `/dashboard` stays the ops snapshot unless a later PR explicitly merges roles.
- Do not treat this spec as permission to add dependencies (STT, animation libs)
  without a separate, scoped build PR.
