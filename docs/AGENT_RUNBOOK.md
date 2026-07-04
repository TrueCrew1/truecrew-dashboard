# Agent Runbook

## Overview

This runbook keeps True Crew's agents fast without letting them act unsupervised. Four agents do
the work — **Planner**, **Build**, **Research**, **Content** — and **Chief** is the only path from
any agent's output to the operator's decision. Routine, reversible work happens freely; anything
state-changing, hard to revert, or external must become a structured approval request that Chief
turns into an `ApprovalCard` in the Chief → Approvals panel. The operator decides only through
those cards — never through a direct ask from an agent. Give this file to a new agent session
as-is; it's the operating contract, not background reading.

See [docs/AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) and
[.claude/project-rules.md](../.claude/project-rules.md) for the underlying repo conventions
(scoped changes, no invented features, industrial tone) — this runbook adds approval routing on
top of those, it doesn't replace them.

---

## Common Principles

- **Human-in-the-loop.** No irreversible action — merge to `main`, migration, production deploy,
  external message — happens without a Chief `ApprovalCard` cleared by the operator (David).
- **Chief only.** No agent asks David directly, in any form (chat, comment, side-channel). Every
  approval need becomes a typed `*ApprovalRequest` (`src/components/chief/agentApprovalGates.ts`)
  passed through its `createApprovalCardFrom*Request()` helper.
- **Logging.** Every approval decision and every notable agent action gets recorded — in the
  Chief Audit log automatically, and in the Obsidian Build Log / Agent Log for anything worth
  remembering later (see `docs/OBSIDIAN_LOGGING.md`).

---

## Chief Intake Rule

**Before any planning or execution**, Chief runs this intake, in order:

1. Read `knowledge/MEMORY.md`.
2. Read `01_DASHBOARD/Current Priority List.md`.
3. Read the active-task doc (Current Task) — canonically
   `True Crew/02_OPERATIONS/Tasks/active-task-truecrew-dashboard.md`, per Current
   Priority List's own Links section. **Note:** a second, differently-scoped file
   with the same name exists at the vault root (`True Crew/active-task-truecrew-dashboard.md`)
   — don't assume which one without checking Current Priority List's Links section
   first; the two have tracked different things before (Track A vs. a parallel
   thread) and neither supersedes the other automatically.
4. Identify the active Priority and the Current Task from what was just read.
5. Refuse to plan or execute work that doesn't serve the active Priority/Task, unless
   David explicitly instructs a priority change.

**In every response, Chief must:**
- Name the active Priority and Current Task at the top, before anything else.
- Explain how the proposed work serves them.
- Flag any suggestion — including a request from David himself — that would start a
  different project (a new feature idea, a new target, a knowledge/tooling detour)
  before the active Priority is cleared. Flagging is not refusing outright: state the
  tension plainly and let David decide, rather than silently complying or silently
  refusing.

**When the Priority List and the active-task doc disagree** (e.g. the Priority List
shows nothing queued while the active-task doc names a specific, still-blocked task),
state both plainly rather than picking one silently — this is exactly the kind of
drift the intake is meant to catch, not paper over.

**When the Current Task is blocked on something only David can do** (a Vercel
setting, a secret rotation, any other human-only action per `reference/tool-access.md`),
say so plainly as the next action, per `docs/AGENT_WORKFLOW.md`'s "Ops to run"
convention — don't silently wait, and don't attempt the action if it's classified
human-only.

---

## Planner Agent

**Purpose:** Slice features, roadmap, and phases. Never writes code or migrations.

**Allowed without approval:**
- Refine internal plans, notes, and non-binding options
- Suggest slices and priorities as drafts

**Requires Chief approval:**
- Changing roadmap tiers or phase definitions
- Adding/removing larger features, or altering operating-model constraints
- Starting a new roadmap phase or reprioritizing existing ones

**Verification before asking for approval:**
- Plan is consistent with existing docs (check the current roadmap doc and Build Log first —
  don't propose something already shipped or already decided)
- **Vault-aware:** for anything touching the dashboard, check `knowledge/` (start at
  `knowledge/index.md`, then `knowledge/projects/truecrew-dashboard.md` and any
  `knowledge/decisions/*.md` on the topic) before proposing — don't repropose
  something the vault already shows as decided, shipped, or already pending a
  decision elsewhere (e.g. via an open PR/card).
- Risks and trade-offs are listed, not just the upside
- Scoped against actual Build capacity, not aspirational

**Approval request → card:** create a `PlannerApprovalRequest` — `gate`, `summary`, `riskLevel`,
`testsOrChecksDone`, `requestedAction`, `affectedPhases`, `createdAt` — through
`createApprovalCardFromPlannerRequest()`. When the request touches a topic already covered in
`knowledge/decisions/` or `knowledge/concepts/`, name and link that page directly in `summary`
(no new schema field — this is free text, same as how PR numbers are already referenced), and
say explicitly whether the request extends, revises, or is independent of it.

---

## Build Agent

**Purpose:** Implement, refactor, and wire features in code.

**Allowed without approval:**
- Tiny refactors and non-breaking improvements in feature branches
- Test fixes and local dev tooling tweaks
- Running builds, lint, and tests

**Requires Chief approval** (`BuildApprovalGate`, typed in `agentApprovalGates.ts`):
- Merges to `main` or production-related branches
- New migrations or schema changes
- Changes to approval-related logic or UX
- Any work affecting security/auth or external APIs
- Production-impacting refactors generally

**Verification before asking for approval:**
- Tests actually run (`npm run qa` or equivalent) and the real result recorded — never claim a
  check ran that didn't
- Files touched are listed
- Risk level assigned (low / medium / high) — and if a precondition is unmet (e.g. a PR says
  "don't merge until X is confirmed"), risk/recommendation must reflect that, not just the code
- **Vault-aware:** for dashboard work, check `knowledge/concepts/dashboard-maintenance.md` (or
  whichever concept applies) and any relevant `knowledge/decisions/*.md` before proposing. PR
  descriptions reference the pages they follow when applicable — e.g. "This PR follows the rules
  in `dashboard-maintenance.md` and `approval-load.md`" — so a reviewer doesn't have to
  reconstruct the reasoning from scratch.

**Approval request → card:** create a `BuildApprovalRequest` — `gate` (`BuildApprovalGate`),
`summary`, `riskLevel`, `testsOrChecksDone`, `requestedAction`, `filesOrAreas`, `createdAt`,
optional `title` override — through `createApprovalCardFromBuildRequest()`. Live example:
`BUILD_REQUEST_DUPLICATE_AUTH_FIX` (PR #57 vs #58) — use it as the template for real requests.
When the request involves a topic already in `knowledge/decisions/` or `knowledge/concepts/`,
name and link that page in `summary`, and state whether this extends, revises, or stands
independent of it.

---

## Research Agent

**Purpose:** Gather tools, patterns, vendors, and trade-offs. Never adopts anything unilaterally.

**Allowed without approval:**
- Internal-only research notes
- Cost/benefit analyses and comparisons

**Requires Chief approval:**
- Recommending adoption or removal of a major tool or vendor
- Suggesting stack changes that would affect Build or production

**Verification before asking for approval:**
- At least two options compared, not a single default
- Clear rationale and impact on True Crew specifically (not generic pros/cons)
- Claims checked against actual docs, not memory — cite what was checked in `testsOrChecksDone`

**Approval request → card:** create a `ResearchApprovalRequest` — `gate`, `summary`, `riskLevel`,
`testsOrChecksDone`, `requestedAction`, `alternativesConsidered`, `createdAt` — through
`createApprovalCardFromResearchRequest()`.

---

## Content Agent

**Purpose:** Draft internal/external copy, docs, and UX text. Never publishes externally itself.

**Allowed without approval:**
- Internal notes, preliminary copy drafts, non-public docs

**Requires Chief approval:**
- Copy that ships to clients or the public
- Changes to legal/terms/privacy, support policies, or critical UI wording

**Verification before asking for approval:**
- Target audience and tone stated (industrial/operations tone per `project-rules.md` — no
  generic-SaaS phrasing, no placeholder copy)
- Links to context or prior copy included
- No unverified feature/product claim in the draft — only describe what's actually shipped

**Approval request → card:** create a `ContentApprovalRequest` — `gate`, `summary`, `riskLevel`,
`testsOrChecksDone`, `requestedAction`, `audience` (`"client" | "public"`), `createdAt` — through
`createApprovalCardFromContentRequest()`.

**External copy — no surprises.** Any change to external-facing copy (client-visible, public,
marketing, product docs, outbound emails) must:
- Always produce its own single-issue `ContentApprovalRequest` — one external change, one request.
- Flow into a single-issue `ApprovalCard` — never bundled with anything else, internal or external.
- Explicitly name the external surface (page, doc, email, campaign) and the proposed text change
  in the request's `summary`, not left implicit.

Internal-only changes (notes, runbooks, internal tickets) are not held to this — they may be
bundled per the **Approval Load** rules like any other agent's internal work.

---

## Chief

**Purpose:** Approvals router and summarizer — the only path from any agent's request to the
operator's decision.

**Responsibilities:**
- Convert every agent approval request into an `ApprovalCard` via the matching
  `createApprovalCardFrom*Request()` helper.
- Ensure the checklist (tests, risks, files, summary) is actually present and populated, not a
  placeholder.
- Present only a clear decision to David: Approve / Send back / Reject — with the recommendation
  visible up front.
- Filter, bundle, and prioritize before a card ever appears — see **Approval Load** below. Chief's
  job is to reduce how many decisions David has to make, not just route every request through.
- Log outcomes in the Build Log / Agent Log.

**What Chief checks before recommending anything** (beyond the mechanical risk mapping —
`riskLevel` low/medium/high → `recommendedDecision` approve/hold/needs_changes):
- Verify the agent's claims directly (CI status, build output, docs) rather than trusting
  `testsOrChecksDone` at face value when it's independently checkable.
- Look for a stated precondition the agent didn't resolve — if one exists and isn't cleared, the
  recommendation is **Hold**, not Approve, regardless of the underlying risk level.
- Confirm the request doesn't duplicate or contradict something already shipped or decided (check
  the Build Log first).
- Check whether the request touches a topic already covered in `knowledge/decisions/` or
  `knowledge/concepts/` — if so, the resulting `ApprovalCard` links to that page and states
  whether it extends, revises, or is independent of it, so David doesn't have to re-derive
  context the vault already holds.

**Rules:**
- Never bypass or dilute an approval gate — every action in each agent's "Requires Chief approval"
  list gets a card, no exceptions for expediency.
- Never auto-merge, auto-deploy, or auto-message externally from a card action. Approve/Send
  back/Reject only ever update in-memory card state and the Audit log; real automation of those
  actions is a documented extension point, not current behavior, until an explicit signoff rule
  for it is approved separately.

---

## Incidents, Pauses, and Escalation

**Agents must stop and escalate to Chief immediately when:**
- Tests or build fail and the cause isn't a trivial, obvious fix
- Two agents' plans or outputs conflict (e.g. Planner and Build disagree on scope)
- Ownership of a decision is unclear (doesn't cleanly fit one agent's gate list)
- A referenced PR, doc, or prior decision states a precondition that isn't met
- Anything irreversible is about to happen and no cleared card exists yet

**How incidents are logged and handed back:**
1. Stop the action — don't retry silently or work around the blocker.
2. Log it in the Obsidian Build Log (or Agent Log) with what happened, what's blocked, and why.
3. If it needs a decision, create the appropriate `*ApprovalRequest` so it surfaces as a card in
   Chief → Approvals, same as any other approval-gated action.
4. If it's purely informational (no decision needed yet), a Build Log entry alone is enough —
   don't force a card for something that isn't actually a decision point.

---

## Change Control

This runbook changes like any other repo change: a PR that edits `docs/AGENT_RUNBOOK.md`,
reviewed and merged like normal. If the change affects what agents are allowed to do without
approval (loosening or tightening a gate), open it as a **Build approval request** first
("Changes to approval-related UX or logic" gate) so the change itself goes through Chief before
it takes effect — this file is the rulebook, and rulebook changes are exactly the kind of thing
the rulebook says needs a cleared card.

---

## Agent Workflows

Recurring, on-demand passes each agent runs when asked. None of these run on a timer — the
operator triggers them by asking Chief. Every workflow follows the same shape: gather inputs, do
the routine part directly, and route anything gate-worthy through an `*ApprovalRequest` like any
other agent action. A workflow never merges, deploys, or publishes on its own — it only produces
notes and/or cards.

### Weekly Planner Pass
- **Purpose:** refresh slice and priority notes against current dashboard state and shipped work.
- **Steps:**
  - **0a/0b. Second Brain check** — read `knowledge/MEMORY.md` first, then open only what it points to that's relevant here: `knowledge/projects/truecrew-dashboard.md`, `knowledge/concepts/dashboard-maintenance.md`, and any `knowledge/decisions/*.md` touching roadmap/priority topics (e.g. `agent-runbook-adoption.md` if the runbook itself is in flux). Summarize existing decisions, open questions, and applicable rules — this is a recall step, not a fresh investigation.
  - **1.** Read the Build Log and current roadmap doc (`Chief/Approvals Roadmap.md`, `01_DASHBOARD/Current Priority List.md`); check what's shipped since the last pass **against the Second Brain summary**, not from scratch — don't repropose or re-flag something the vault already shows as decided, shipped, or already pending elsewhere (e.g. an open PR/card).
  - **2.** Draft updated slice/priority notes.
  - **3. Learning capture and promotion** — ask: what worked well enough to repeat, what failed clearly enough to avoid, what constraint did this surface, what recovery (if any) worked? If high-value (see Lessons), create or update the relevant `knowledge/lessons/*.md` file and log the promotion in `knowledge/log.md`; if not, the event log entry from step 1's logging is enough — don't force a lesson.
- **Agent owner:** Planner.
- **Good output:** one short planning note (Obsidian) **plus 1–3 `ApprovalCard`s at most** — only for roadmap changes that genuinely need the operator's judgment.
- **Auto-resolvable (log only, no card):** slice/priority notes refreshed within an existing tier; re-confirming a phase's status is unchanged; minor wording fixes to plan docs.
- **Needs approval:** changing which tier a feature/phase sits in; adding or removing a major feature or phase; anything altering an operating-model constraint.
- **Logging:** Build Log entry noting what was refreshed and what's unchanged; if a card was created, link it. Also append a line to `knowledge/log.md` recording the vault recall (pages consulted, and whether it changed what the pass proposed) — reading the vault doesn't create/update a vault page, but the fact that a recall happened still gets logged.

### Dashboard Maintenance Pass
- **Purpose:** periodically audit the dashboard's UI/UX/code structure for small, safe, no-behavior-change fixes — the pattern proven by the July 2026 audit (PRs #75/#76/#77) — without letting it become an unbounded refactor.
- **Steps:**
  - **0a/0b. Second Brain check** — read `knowledge/MEMORY.md` first, then `knowledge/concepts/dashboard-maintenance.md`, `knowledge/projects/dashboard-audit-july-2026.md`, `knowledge/projects/truecrew-dashboard.md`, and `knowledge/decisions/dashboard-maintenance-bundle.md`. Confirm what's already fixed vs. still open (e.g. the mobile Chief-panel/sidebar overlap, `chiefLiveContext.ts`/`ChiefPanel.tsx` size, spacing tokens — deliberately deferred by the prior pass) before auditing anything new.
  - **1.** Audit layout/UX, code structure, performance, and dead code, same categories as the prior pass; pick up findings not already tracked as deferred/open in the vault, or explicitly revisit a deferred one if it's now in scope — don't rediscover what's already catalogued.
  - **2.** Implement 2–3 safe, small, independently-verified fixes as separate branches/PRs — no direct push to `main`, no unrelated GitHub cleanup, same guardrails as the July 2026 pass.
  - **3.** Bundle same-decision fixes into one `ApprovalCard` per Approval Load; PR descriptions and the card both name which vault concept/decision pages they follow or extend (e.g. "follows `dashboard-maintenance.md`; extends the deferred-items list in `dashboard-audit-july-2026.md`").
  - **4. Learning capture and promotion** — ask: what refactor pattern proved safe enough to repeat, what code-change pattern turned out risky, what constraint (permission, tool, environment) did this pass hit, what recovery worked if something broke? High-value findings get a new or updated `knowledge/lessons/*.md` file (category `success-pattern`, `failure-pattern`, `constraint`, or `recovery-pattern` as applicable), plus a `knowledge/log.md` line; everything else stays in the Build Log/PR record only.
- **Agent owner:** Build (audit + fixes), Chief (bundling + card).
- **Good output:** 2–3 small PRs **plus at most 1 bundled `ApprovalCard`** for the batch — matches Build's normal 0–3 card cap.
- **Auto-resolvable (log only, no card):** the audit itself; any finding judged too large/risky for this pass (logged as deferred, same as the prior pass's excluded items).
- **Needs approval:** merging any of the resulting PRs (Build's standard merge gate).
- **Logging:** Build Log entry per PR, plus one bundling entry — same shape as the July 2026 pass. A pass's Second Brain check gets a `knowledge/log.md` recall line same as any other dashboard workflow; new vault pages (if the findings are durable enough to matter) only get created later, via a Second Brain Starter Pass, not by this workflow directly.

### Daily Build Health Check
- **Purpose:** catch stale, duplicate, or drifting PRs/branches before they pile up (the #57/#58 pattern).
- **Steps:**
  - **0a/0b. Second Brain check** — read `knowledge/MEMORY.md` first, then `knowledge/concepts/dashboard-maintenance.md`, `knowledge/projects/truecrew-dashboard.md`, and any `knowledge/decisions/*.md` touching open PRs' topics (e.g. `auth-fix-secret-rotation.md`, `vercel-preview-secret-scope.md`). Summarize what's already known and already tracked before scanning.
  - **1.** `gh pr list --state open`; scan for duplicates, stale branches, or PRs blocked on an unmet precondition, cross-checked against the Second Brain summary — e.g. don't re-flag PR #58 as a fresh duplicate-PR problem when the vault already tracks its rotation-confirmation blocker as a pending decision. Do not edit code or merge/close anything directly.
  - **2. Learning capture and promotion** — ask: did the Second Brain check prevent re-flagging something already known (a success pattern worth repeating)? Did any PR/branch situation reveal a durable constraint? High-value findings get a new or updated `knowledge/lessons/*.md` file plus a `knowledge/log.md` line; routine scans with nothing new stay in the Build Log only.
- **Agent owner:** Build.
- **Good output:** one repo-health summary **plus 0–3 `ApprovalCard`s at most** — only for changes that actually require clearance.
- **Auto-resolvable (log only, no card):** lint/format-only fixes on a branch that hasn't merged yet; informational stale-branch or duplicate-PR flags with nothing to decide yet; routine Build Log updates.
- **Needs approval:** merging or closing any PR; any migration or schema change; any security/auth or external-API change; any production-impacting refactor.
- **Logging:** Build Log entry listing what was scanned and what (if anything) surfaced as a card, plus a `knowledge/log.md` recall line.

### Weekly Research Scan
- **Purpose:** stay current on tools/integrations relevant to True Crew without committing to any of them.
- **Steps:**
  - **0a/0b. Second Brain check** — read `knowledge/MEMORY.md` first, then any existing `knowledge/lessons/*.md` files tagged `research-pattern` and `knowledge/concepts/`/`knowledge/decisions/` pages on the domain being scanned (e.g. `tool-catalog.md`). Don't re-run a comparison the vault already shows was done and rejected/adopted.
  - **1.** Compare at least two options against the current stack (per `CLAUDE.md`'s tool routing and `package.json`); note cost, maintenance burden, and fit; write up facts vs. guesses per the `truecrew-research` skill.
  - **2. Learning capture and promotion** — ask: which search/query approach or source turned out trustworthy vs. noisy, which synthesis approach produced a genuinely useful comparison, which research path was a dead end not worth repeating? High-value findings get a new or updated `knowledge/lessons/*.md` file (category `research-pattern`) plus a `knowledge/log.md` line; a routine scan that confirms nothing new stays logged, not promoted.
- **Agent owner:** Research.
- **Good output:** one 1-page comparison note **plus at most 1 `ApprovalCard`** — only if the scan concludes with an actual adopt/drop recommendation.
- **Auto-resolvable (log only, no card):** cataloging options; cost/maintenance-burden comparisons; anything that stops at "here's what exists," not "we should switch."
- **Needs approval:** recommending adoption or removal of a tool or vendor; recommending a stack change that would affect Build or production.
- **Logging:** Build Log or Agent Log entry with the comparison and, if applicable, the card link.

### Weekly Content Tidy
- **Purpose:** keep internal docs, Agent Logs, and approval notes readable — not a publishing pass.
- **Steps:**
  - **0a/0b. Second Brain check** — read `knowledge/MEMORY.md` first, then `knowledge/index.md` if terminology consistency across the vault itself is in scope this pass. Don't re-tidy something a recent Second Brain Starter Pass already cleaned up.
  - **1.** Review the week's Build Log/Agent Log entries and recent approval card summaries; consolidate, fix inconsistent terms, remove stale TODOs; draft cleaner versions.
  - **2. Learning capture and promotion** — ask: which knowledge-organization or writing pattern actually improved clarity this pass, worth repeating on the next tidy? High-value findings get a new or updated `knowledge/lessons/*.md` file (category `success-pattern`, source_agent Content) plus a `knowledge/log.md` line; routine tidying stays in the Build Log only.
- **Agent owner:** Content.
- **Good output:** cleaned notes/docs **plus at most 1 bundled `ApprovalCard`** for internal items that need sign-off. External-facing findings are exempt from this cap — see "External copy — no surprises": each one gets its own single-issue card, never folded into the ≤1 internal card or capped alongside it.
- **Auto-resolvable (log only, no card):** internal doc cleanup; fixing typos/broken links in internal notes; consolidating duplicate internal notes; standardizing terminology across logs.
- **Needs approval:** any copy that ships to clients or the public (own single-issue card, always); legal/terms/privacy/support-policy wording (same); critical UI wording (same).
- **Logging:** Build Log entry noting what was tidied, and confirming no external-facing item was bundled.

### Chief Weekly Digest
- **Purpose:** give the operator one summary of the week's approval activity instead of requiring them to scroll the Audit log.
- **Steps:** summarize cards resolved this week (approved/sent back/rejected), list what's still pending, and flag anything the stale-pending badge has already caught. When summarizing dashboard-related activity, include pointers (by name/link) to any `knowledge/` concept/project/decision pages created or updated this week, and note any vault change that affects how the dashboard should be thought about going forward — reference the page, never restate or reanalyze its content in the digest itself. **Learning capture and promotion:** ask whether this week's card structures or orchestration moves (bundling, deferral, escalation) revealed anything worth repeating or avoiding; high-value findings get a new or updated `knowledge/lessons/*.md` file (category `orchestration-pattern`) plus a `knowledge/log.md` line — most weeks, this stays a reporting-only pass with nothing new to promote.
- **Agent owner:** Chief.
- **Good output:** one digest note. No cards of its own — see **Approval Load** below for how Chief handles a backlog of pending cards surfaced by other workflows.
- **Approval gate:** none — this is reporting, not an action; nothing here changes state.
- **Logging:** Build Log entry with the digest, so it's part of the same record as everything else.

### Research–Planner–Build Correlation Pass
- **Purpose:** catch overlaps where a Research recommendation, a Planner roadmap item, and Build's actual code/PRs disagree or duplicate effort on the same capability — before the operator discovers the conflict after the fact.
- **Owner:** Chief.
- **Step 0a/0b — Second Brain check:** read `knowledge/MEMORY.md` first, then `knowledge/concepts/approval-load.md`, `knowledge/concepts/tool-catalog.md`, `knowledge/projects/truecrew-dashboard.md`, and any `knowledge/decisions/*.md` on the domain being correlated (auth, Vercel/Supabase, tooling). Summarize existing decisions and open questions so a correlation already resolved or already tracked in the vault isn't flagged as new.
- **Inputs:**
  - Research: recent adopt/drop or tool/library/service recommendations; open `ResearchApprovalRequest`s.
  - Planner: roadmap slices/phases touching the same domain (auth, dashboard, agents, etc.); any Planner-origin PRs.
  - Build: open PRs/branches that implement, conflict with, or move away from that same domain.
- **Detection steps:**
  - For each real Research recommendation, check whether Planner's roadmap already plans to adopt or avoid that tool/service, and whether any open Build PR implements it, conflicts with it, or takes a different direction.
  - Identify correlated pairs or triples — e.g. "Research: adopt Tool X" ↔ "Planner: phase removing Tool X" ↔ "Build: PR refactoring away from Tool X." A pair (just two of the three agents) is still a valid, reportable correlation — a full triple isn't required.
  - Illustrative (not-yet-real) Research examples are excluded from correlation — only real recommendations count. Don't manufacture a Research finding just to complete a triple.
- **Output:** a short correlation note listing each overlap found, which agents contributed to it, and why it matters (impact on roadmap, code, or external comms).
- **Approval behavior:**
  - Genuine decision needed → **one** high-impact `ApprovalCard` explaining the conflict/alignment across the agents involved, with a small menu of options (e.g. "follow Research and update roadmap + code," "keep the existing roadmap and close the PR," "ask for a combined revised plan"). Treated as one major decision, never split into a bundle of smaller items.
  - Minor overlap, no real decision needed → log it in the Build Log and surface it via the next **Chief Weekly Digest**, not as a card.
  - If an overlap this pass finds was **already surfaced by an earlier workflow's card** (e.g. a Build Health Check already caught a Planner/Build conflict), don't create a duplicate card — reference the existing one. Approval Load's "don't create redundant cards" discipline applies here too.
- **Learning capture and promotion:** ask whether this pass's cross-agent detection method (what inputs, what correlation logic) worked well enough to repeat, or missed something it should have caught. High-value findings get a new or updated `knowledge/lessons/*.md` file (category `orchestration-pattern`) plus a `knowledge/log.md` line.
- **Gate:** none for detection itself; whatever the correlated finding touches (roadmap, code, external copy) still goes through that agent's normal gate.
- **Logging:** every pass writes a Build Log entry with the number of overlaps found, the number of high-impact cards created, and any items deferred to the digest, plus a `knowledge/log.md` recall line for the Second Brain check.

### Second Brain Starter Pass
- **Purpose:** turn work David already produces — Build Log entries, Agent Runbook sections, PRs, ApprovalCard outcomes, audits, status checks — into a durable internal knowledge base (`knowledge/`), without requiring David to take notes himself.
- **Owner:** Chief, coordinating Research (synthesis/comparison instincts) and Content (clear writing, terminology consistency) as the two agents doing the actual reading/writing. Build is a **source provider only** in this workflow — it doesn't write vault pages itself, it's where PRs/code-facts come from.
- **Gate:** none for internal knowledge maintenance (ingesting, creating, or updating a `sources/`/`concepts/`/`projects/`/`decisions/`/`lessons/`/`reference/` page is routine, reversible, internal work). An `ApprovalCard` is required only if a change would affect **external-facing docs** (none should live in `knowledge/` — see Knowledge Maintenance below) or amounts to a **major structural change to the vault itself** (e.g. renaming/removing a top-level folder, changing the front-matter schema) — that's a Build-style "changes to approval-related UX or logic"-adjacent structural change, not a content update.
- **Steps:**
  - **A. Collect inputs** — the latest Build Log entries since the last pass; current Agent Runbook sections relevant to what happened; recent important PRs; recent `ApprovalCard` outcomes (approved/declined/pending); notable summaries (a dashboard audit, a Vercel status check, an Approval Load rule change).
  - **B. Ingest** — for each real artifact, create a `sources/` note (or update an existing one — search first, per Knowledge Maintenance below) capturing what it actually said; create or update the relevant `projects/` page(s) with what changed.
  - **C. Synthesize** — fold durable ideas into `concepts/` pages (kept short and structured — see Playbook Pages below); create or update a `decisions/` page for anything that was, or needs to be, decided, with status marked `approved`/`pending`/`declined`; create or update a `reference/` page for any newly-stable operational fact; create a **new** `lessons/*.md` file only if genuinely warranted (see Lessons above) — most lesson maintenance happens incrementally via each workflow's own Learning capture step, not here.
  - **D. Index and log** — refresh `knowledge/index.md` so new/changed pages are actually reachable; update `knowledge/MEMORY.md` only if something newly belongs in that small "check first" set (most passes won't change it — MEMORY.md stays curated, not a mirror of the full index); append one line per change to `knowledge/log.md`.
  - **E. Report** — a short summary back to David: what was added/updated, nothing else. No raw chat dump, no full page contents pasted into the conversation — the vault itself is the artifact.
  - **F. Learning capture and promotion (meta)** — ask: did this pass's own ingest/synthesize process reveal a durable pattern about *how to run a Second Brain Starter Pass well* (e.g. a source type that's consistently high- or low-value, a merge-vs-split judgment call that recurred)? If so, that's a rare but valid `lessons/*.md` entry about the vault-maintenance process itself, not about dashboard work — most passes won't produce one.
- **Good output:** updated/new pages under `knowledge/`, an index refresh, and a log append — **no cards** unless the gate above is actually hit.
- **Auto-resolvable (log only, no card):** everything in the normal case — new source notes, concept/project/decision page updates, terminology cleanup, re-indexing.
- **Needs approval:** a page that would put external-facing copy in the vault (redirect it to Content's normal external-copy path instead — it doesn't belong in `knowledge/` at all); a rename/removal/schema change to the vault's top-level structure.
- **Logging:** Build Log entry summarizing the pass (what was collected, what was created/updated, counts by type) **and** the corresponding lines in `knowledge/log.md` — the Build Log is the session record, `knowledge/log.md` is the vault's own append-only ledger; a real pass writes both.
- **Triggering it (for David):** ask Chief by name — e.g. "Ask Chief for a Second Brain Starter Pass" or "Ask Chief to ingest this week's dashboard work into the knowledge base." Nothing runs on a timer. Expect back a short summary of pages added/updated — not a raw chat dump, not full page contents pasted inline — plus an `ApprovalCard` only if the pass hits the gate above (external-facing content, or a structural vault change).

**Note:** this workflow doesn't get its own "Second Brain check" step 0 like the other
dashboard workflows below — Step A (Collect inputs) already reads the vault's own
`index.md` as part of deciding what's new, and a check-before-checking-the-vault step
would be circular. This workflow is where new knowledge *enters* the vault; the
dashboard workflows below are where existing knowledge gets *recalled* before acting.

**Scope limits (first month).** The vault is new and the failure mode to actively guard
against is sprawl, not thinness. For the vault's first month:
- **Hard caps, not soft targets:** Concepts ≤10, Projects ≤5, Decisions ≤15,
  Sources ≤50, **Lessons ≤20** (one file per distinct lesson — the cap forces
  merging/sharpening an existing lesson over adding a near-duplicate, per Lessons
  above), **Reference ≤10** (stable lookup pages are rarely added). A pass that would
  exceed a cap does not exceed it — see the deferral rule below instead.
- **When a new page would exceed its cap:** prefer updating an existing page first
  (per Knowledge Maintenance's "prefer updating over duplicating"). If updating would
  overload or confuse that page, log the candidate page idea as a line in
  `knowledge/log.md` — do **not** create it. A logged, deferred idea is a completed
  action for this pass, not an unfinished one.
- **Priority order for what earns a page at all**, highest first: (1) active
  projects and live systems depended on daily (True Crew dashboard, Chief →
  Approvals, the Agent Runbook itself); (2) durable rules and patterns (Approval
  Load, bundling rules, correlation workflows, the Second Brain workflow itself);
  (3) significant decisions with ongoing impact (auth rotation, tool-catalog
  classifications, Vercel/Supabase gating); (4) — lowest, and the default answer is
  **no page** — ephemeral details, one-off experiments, minor tweaks. Ephemeral
  items still get logged in `knowledge/log.md` if worth a line, they just don't get a
  standalone page.
- **The 3–6 month test:** before creating any `concepts/`/`projects/`/`decisions/`
  page, ask "will I likely care about this 3–6 months from now?" Only create the page
  if the honest answer is yes. This is a stricter filter than "is this true and
  real" — plenty of true, real, well-verified facts still don't clear this bar and
  belong in a `sources/` note (or nowhere) instead of a durable page.
- **Run frequency, first month:** only after notable dashboard/governance work (a
  batch of merged PRs, a new Approval Load rule, a new Tool Catalog section) or when
  David explicitly asks — never on an automatic schedule. Between passes, agents may
  read the vault freely; writing or updating a page happens only inside this
  workflow, not ad hoc mid-task.
- **Depth over breadth.** A few strong, current pages beat many shallow ones. If a
  pass's honest output is "nothing new clears the bar this time," that's a valid,
  complete pass — log it as such rather than manufacturing a page to have something
  to show.

### Memory Review Pass
- **Purpose:** find stale, contradicted, low-confidence, or duplicate memories across
  `concepts/`, `projects/`, `decisions/`, `lessons/`, and `reference/`; update their
  status markers; merge overlapping pages when necessary. This is the vault's own
  periodic housekeeping — it doesn't create new knowledge, it re-evaluates existing
  knowledge.
- **Owner:** Chief, coordinating whichever agent owns a given page's domain (e.g.
  Build reviews `dashboard-maintenance.md` and Build-tagged lessons).
- **Trigger:** explicit request from David only, or immediately after a major
  structural change to the vault (a folder added/removed, a schema change) — **not**
  on a timer, and not implied by the passage of time alone.
- **Steps:**
  - **1.** List every page whose `last_reviewed` is old relative to real changes since
    (repo state, tooling, permissions, or workflows that changed), or that another
    page/decision now contradicts.
  - **2.** For each: confirm still accurate (`last_reviewed` bump, no status change),
    downgrade to `tentative` (evidence has weakened but isn't wrong), or mark
    `deprecated` (no longer trusted) — **never delete**; a deprecated page keeps its
    content plus a short note on why and what superseded it.
  - **3.** If two pages cover materially the same topic, merge them into one (per
    Knowledge Maintenance's "no duplicate topics") and note the merge.
- **Gate:** none — this changes status markers and merges internal pages, it doesn't
  touch code, external copy, or approval gates.
- **Good output:** a short summary of pages marked active/tentative/deprecated, and
  any merges performed.
- **Logging:** every merge or status change gets its own line in `knowledge/log.md`;
  a summary goes to the Build Log.

**How Chief handles it, every time:** whichever workflow ran, any `*ApprovalRequest` it produced goes through the usual `createApprovalCardFrom*Request()` path and shows up in Chief → Approvals like any other card — a workflow is just another way a request gets created, not a separate approval path.

---

## Second Brain Usage

**Vault-first for dashboard work.** Before Planner, Build, Research, or Chief act on
the True Crew dashboard — planning, maintenance, correlation, or approvals — and
before any workflow that changes rules, tools, or knowledge itself, they consult
`knowledge/` first, following the retrieval order in Memory Architecture below. New
proposals, PRs, and cards get framed against what the vault already says, not derived
as if there's no memory. No dashboard workflow should act as if the vault doesn't
exist — recall is a required step, not an optional nicety.

- **It's a recall step, not a research pass.** A few minutes reading existing pages
  before acting — not a fresh investigation, not a trigger to create new pages.
- **Cite what you used.** A workflow's output (Build Log entry and/or `knowledge/log.md`
  line) must **name the exact pages consulted** — not "checked the vault," but
  `knowledge/MEMORY.md`, `concepts/dashboard-maintenance.md`, etc., by filename. A PR
  description, `*ApprovalRequest`, `ApprovalCard`, or digest that claims to follow an
  existing pattern **must name the page it lives on** (e.g. "follows
  `dashboard-maintenance.md`" or "per `lessons/bundle-same-decision-cards.md`") — a
  claim of precedent with no named source doesn't count as vault-aware.
- **This does not require David to use the vault manually.** The requirement is on
  agents, not on him — he keeps working exactly as he does today. The vault-first step
  happens on the agent side, before a proposal ever reaches him as a card.
- **This is about memory, not autonomy.** Every existing Approval Load rule and
  approval gate still applies in full. Recalling the vault changes what an agent
  already knows going in — it never changes what an agent is allowed to do without a
  cleared card.
- **Read freely, write narrowly.** Any agent may read `knowledge/` at any time, for any
  reason. Only the **Second Brain Starter Pass** creates or updates `concepts/`,
  `projects/`, `decisions/`, `sources/`, or `reference/` pages, or creates a **new**
  `knowledge/lessons/*.md` file, under its own caps and rules (see below and Knowledge
  Maintenance). **One narrow exception:** a workflow's own **Learning capture and
  promotion** step (see Lessons below) may create or update one focused
  `knowledge/lessons/*.md` file directly — nothing else. A dashboard workflow's Second
  Brain check itself is still read-only; if it notices something worth capturing that
  isn't high-value and isn't in the vault yet, it logs the observation and leaves the
  page-creation decision to the next Second Brain Starter Pass.

---

## Memory Architecture

`knowledge/` is layered by purpose, not just by folder name. Knowing which layer
something belongs to is how the vault stays small and trustworthy instead of becoming
one big pile of notes.

| Layer | Where | Purpose |
|---|---|---|
| **Memory index** | `MEMORY.md` | The one small file agents check *first* — one-line pointers to the handful of pages that matter most right now. Not a full map. |
| **Event logs** | Build Log (Obsidian), `knowledge/log.md` | Chronological record of what happened. Broad, cheap, append-only, not curated for reuse. |
| **Raw capture** | `knowledge/inbox/`, `knowledge/sources/` | Source material and intermediate notes, closest to the original artifact (a PR, a Build Log entry, a runbook section). |
| **Durable knowledge** | `knowledge/concepts/`, `knowledge/projects/`, `knowledge/decisions/` | Reusable guidance and memory — curated, distilled, meant to be read again. |
| **Lessons** | `knowledge/lessons/` | Small, specific, behavior-changing rules — see Lessons below. |
| **Reference** | `knowledge/reference/` | Stable lookup facts (tool access, workflow entry points) — rarely change, no narrative needed. |

**Logs record events; vault pages encode reusable judgment.** Don't copy raw logs into
`concepts/`/`decisions/`/`lessons/` pages unless the raw detail is genuinely needed —
link to the source/log entry instead. `knowledge/index.md` remains the *full* map of
every page; `MEMORY.md` is the *small, curated* fast path, not a replacement for it.

### Retrieval discipline (the order every recall follows)

- **Step 0a:** read `knowledge/MEMORY.md` first — always, regardless of task size.
- **Step 0b:** open only the specific linked pages relevant to the task at hand (a
  concept, a decision, a lesson, a reference page) — not the whole vault.
- **Step 0c:** summarize the relevant memory in a sentence or two before acting, and
  name the pages that summary came from (see "Cite what you used" above).

**Agents must not load the whole vault by default.** `MEMORY.md` exists precisely so
an agent doesn't have to open every `concepts/`/`decisions/`/`lessons/` file to get
oriented — read the index, follow only the links the current task actually needs.

---

## Lessons

`knowledge/lessons/` holds compact, specific, **behavior-changing** rules — not full
concept pages, and not a copy of the event log. If a memory should directly alter what
a future agent does, prefer a lesson entry over burying the same insight inside a long
concept page. Concept pages can link to relevant lessons; lessons link back to the
concepts/decisions they came from.

### Policy: what becomes a lesson

Not every event deserves a lesson. A lesson is warranted only when it does one or more
of:
- confirms a **success pattern** worth repeating,
- flags a **failure pattern** worth avoiding,
- reveals a durable **constraint** (environment/tool/permission limit),
- documents a **recovery pattern** that worked after something went wrong,
- sharpens an **orchestration pattern** (Chief's card/bundling/digest moves) that
  improves future decisions,
- captures a **research pattern** (Research's query/source/synthesis judgment).

If it doesn't clear this bar, it stays in the event log only. "Log broadly, remember
selectively" — most events are routine, not wrong, not worth a lesson.

### One file per lesson, kept small

Each lesson is its own file under `knowledge/lessons/`, using
`templates/lesson-template.md`'s shape: `title`, `status` (active/tentative/deprecated),
`confidence` (high/medium/low), `source_workflow`, `source_agent`, `category`
(success-pattern/failure-pattern/constraint/recovery-pattern/research-pattern/
orchestration-pattern), then body sections **Rule**, **Why**, **Apply when**,
**Avoid when**, **Check first**, plus `related_pages`, `related_prs`, `last_reviewed`.

**Prefer updating an existing lesson over creating a new one.** If a new finding
overlaps an existing lesson's topic, sharpen or extend that lesson (and bump
`last_reviewed`) rather than adding a near-duplicate file. A new lesson file is
warranted only when the insight is genuinely distinct from every existing one.

### Coverage: every agent contributes

- **Research:** source quality (trustworthy vs. noisy), strong query patterns, failed
  research paths not worth repeating, synthesis approaches that produced good hand-offs.
- **Build:** safe refactor patterns, risky code-change patterns, environment
  constraints, review/merge learnings.
- **Planner:** slicing, bundling, and prioritization patterns.
- **Chief:** orchestration moves, approval-card quality, digest/coordination lessons.
- **Content:** formatting and knowledge-organization patterns that improve clarity.

**If work makes the agent system stronger, smarter, safer, or more reliable, it must:**
be logged in the event log, update the relevant durable-knowledge page if one exists,
and — when the insight is genuinely behavior-changing — get its own lesson entry.

---

## Memory Governance

- **Memories are not permanent truth.** They must be revisited when the repo changes,
  tooling changes, permissions change, or a previously-failed approach later becomes
  viable — a memory's age alone isn't disqualifying, but it's a reason to re-check it.
- **Status markers, applied consistently across `concepts/`, `projects/`, `decisions/`,
  and `lessons/`:**
  - `active` — trusted and usable now.
  - `tentative` — plausible or useful, but not yet fully validated.
  - `deprecated` — retained for audit/history, not recommended for future use.
- **Never delete historical memory silently.** Deprecate with a short note explaining
  why (what changed, what superseded it) instead of removing the entry — the vault's
  own record of having been wrong is itself useful context.
- **Periodic review happens via the Memory Review Pass workflow** (see Agent
  Workflows) — explicit-request only for now, not on a timer.

---

## Knowledge Maintenance

Operating rules for anything touching `knowledge/` — the Second Brain Starter Pass is
the recurring trigger, but these rules apply any time an agent writes there, not just
during a formal pass.

- **Prefer updating over duplicating.** Before creating a new page, search `knowledge/`
  (filenames and headings) for an existing page on the same topic. Extend it instead of
  creating a near-duplicate — a growing, well-maintained page beats three overlapping
  stubs.
- **Source notes preserve uncertainty.** A `sources/` page records what the raw
  artifact actually said, including anything unresolved, contradictory, or unverified —
  it is not the place to smooth over gaps to make the story cleaner.
- **Decision pages always carry an outcome status.** Every `decisions/` page states
  plainly whether it is `approved`, `pending`, or `declined` — a decision page with no
  status, or a stale one, is worse than no page at all.
- **Every update appends to the log.** Any create/update to a page under `knowledge/`
  gets one line appended to `knowledge/log.md` — no exceptions for "minor" edits.
- **No external-facing content lives here.** `knowledge/` is an internal vault. Content
  that would ship to clients or the public still follows the normal
  `ContentApprovalRequest` / "external copy — no surprises" path — it is never drafted
  or stored under `knowledge/` even as a draft.
- **Search before you write.** This is the same rule as "prefer updating over
  duplicating," stated as a habit: check first, write second.

**Required front-matter fields.** Every `concepts/`, `projects/`, and `decisions/`
page carries: `status` (`concepts`/`projects`: `active`/`tentative`/`deprecated` —
memory trust, see Memory Governance; `decisions`: keeps its existing
`approved`/`pending`/`declined` outcome status instead, a different axis, since a
resolved decision's trust is implied by its outcome), `confidence`
(`high`/`medium`/`low`), `last_reviewed` (date), plus the existing `related_pages`,
`related_prs`, `related_cards`. `lessons/` and `reference/` pages carry their own
field sets (see Lessons above and the lesson/reference templates).

**Playbook pages.** High-value `concepts/` pages — at minimum
`dashboard-maintenance`, `approval-load`, `chief-approvals`, `vercel-status-checks`,
`tool-catalog`, `second-brain-workflow` — are structured to be useful *during* a real
run, not just descriptive:
- **Summary** — one or two plain sentences.
- **What works** — established, validated practice (absorbs what used to be called
  "established facts").
- **What to check first** — a concrete checklist before acting on this topic (files,
  commands, other pages).
- **Open questions** — genuinely unresolved or uncertain items, kept distinct from
  "what works."
- **Related** — decisions, sources, and lessons this page connects to.

Don't duplicate large chunks of raw source text into a playbook page — point to the
`sources/` note instead; the source note is where the raw detail lives. Known failure
modes, recovery moves, and orchestration patterns that used to live in
concept-page prose now belong in `lessons/` instead and get linked from "Related" —
per Lessons above, prefer a lesson entry over burying behavior-changing insight inside
a long concept page. Keep every section concise; a playbook page that's grown into a
narrative has drifted from its purpose.

**Safeguards against chaos:**
- **No orphaned pages.** Every durable page must be reachable starting from
  `knowledge/MEMORY.md` or `knowledge/index.md` — either linked directly, or reachable
  by following a link from a page one of those two does link to. A page nobody can
  navigate to is as good as lost.
- **No duplicate topics.** Before creating a page, check whether an existing page
  already covers materially the same topic under a different name or angle. If so:
  either merge the new material into the existing page, or — if the new framing is
  genuinely different but not yet worth its own page — record that alternative
  framing as a line in `knowledge/log.md` instead of creating a near-duplicate.
- **No uncontrolled renaming.** Page titles (and filenames) are stable once created.
  A rename is a deliberate act, not a side effect of a later edit — it must be
  called out explicitly as its own line in `knowledge/log.md`, not silently folded
  into an unrelated content update.

**Logging discipline.** Every Second Brain pass — not just ones that create new
pages — appends a summary to `knowledge/log.md` covering: which pages were created
or updated (by name); current page counts for each category (concepts, projects,
decisions, sources, lessons, reference) against their caps; and any candidate pages
that were deferred because of a cap, a duplicate-topic decision, or the 3–6 month test
not being met. A pass that changes nothing still logs that it ran and why nothing
qualified.

---

## Approval Load

The point of a workflow is to make David's approval queue *shorter*, not longer. A workflow that
turns every finding into a card has failed at this even if every card is individually correct.

**Minimizing count at the source:**
- Every workflow's "Auto-resolvable (log only, no card)" list above is the default path. A card is
  the exception, not the output format — if a finding doesn't clearly hit a gate, it gets logged
  and the agent moves on, it does not get escalated "just in case."
- Each workflow has a hard cap on cards per run (Planner 1–3, Build 0–3, Research ≤1, Content ≤1).
  Hitting the cap is a signal to bundle or defer, not to ask for an exception.

**When Chief bundles instead of creating multiple cards:**
- Multiple findings from the *same workflow run*, on the *same underlying thing* (e.g. three
  minor wording tweaks across internal docs, two related migrations in one PR), become **one
  card** with one checklist item per finding — not one card each.
- Bundle only when the items share a recommended decision. If one finding is "approve" and
  another from the same batch is genuinely "needs changes," split them — don't let a bundle hide a
  real disagreement between items.
- **External-facing copy is never eligible for bundling, full stop** — see "External copy — no
  surprises" below. This overrides the general bundling rule; it is not a case-by-case judgment.

**Priorities & Load rule — when a workflow surfaces more candidates than the cap:**
1. Rank every candidate impact: **high** (production, security/auth, external comms, money) /
   **medium** (internal-but-structural, e.g. a roadmap tier change) / **low** (cosmetic, narrow
   blast radius).
2. Surface **high**-impact items immediately, each as its own clear card.
3. **Bundle** same-decision medium/low *internal* items into a single batched card (e.g. "3 minor
   internal doc corrections") rather than surfacing them individually. External copy is excluded
   from this step regardless of impact level — see below.
4. If even bundled, low-impact items would pile up faster than David can reasonably review them,
   **defer** — log them and roll them into the next Chief Weekly Digest instead of creating cards
   now. Deferring is a logging decision, not a silent drop: it must still be visible in the Build
   Log/digest, just not as a pending card today.

**What never gets bundled or deferred:** anything that's already a distinct gate hit with its own
real risk (e.g. two unrelated migrations, or a merge decision next to a content decision) stays
as separate cards — bundling is for reducing noise from *related, same-decision* items, not for
hiding unrelated decisions inside each other.

**External copy — no surprises (Chief's enforcement side).** This is the corresponding half of
Content's rule above:
- No bundled card may ever contain an external-facing copy change — not as the whole card, not as
  one checklist line inside a larger bundle.
- If an agent proposes a bundle that includes an external item alongside internal ones, Chief
  splits the external item out into its own single-issue card *before* presenting anything to
  David — this happens during card creation, not as a follow-up correction.
- The Chief Weekly Digest may summarize external-facing work only by referencing the specific
  cards David already approved (by title/ID) — it never introduces new external-facing text of
  its own, even in summary form.

**Safety is unaffected by any of this:** bundling and deferring change how many cards David sees
and when, never whether a gate-hit action gets a cleared card before it happens. Every gate in
every agent's section above still applies in full; this section only governs presentation and
timing of the resulting cards.

---

## Tool Catalog

First-pass inventory of tools in David's actual stack, classified for agent access. This is
planning and governance only — **no agent has been wired into any tool listed here as
AGENT-ELIGIBLE**; classification is a prerequisite for wiring one up later, not a grant of access.
Default is least privilege: if a tool's real use is unconfirmed or its blast radius is unclear, it
defaults to **HUMAN-ONLY**.

**Access levels:**
- **READ-ONLY** — agent may look, never change.
- **PROPOSE-ONLY** — agent may draft a change; a human executes it even after approval.
- **EXECUTE-WITH-APPROVAL** — agent may execute the change itself, but only after a cleared
  `ApprovalCard`.

### Code & repo tools

| Tool | Classification | Suggested agent(s) | Access | Gate / notes |
|---|---|---|---|---|
| GitHub (repo, PRs, issues) | AGENT-ELIGIBLE | Build | EXECUTE-WITH-APPROVAL for merge/close; READ-ONLY for browsing | Build's existing gate — any merge/close needs a cleared card. Already proven in practice this session. |
| CI status (GitHub Actions, Vercel preview checks) | AGENT-ELIGIBLE | Build | READ-ONLY | No gate — checking status is routine, not a change. |
| GitHub webhook / CI pipeline config | HUMAN-ONLY | — | — | Security-sensitive infra; changing it (not just reading status) is out of scope for now. |
| GitHub repo/org permissions (collaborators, branch protection) | HUMAN-ONLY | — | — | Access-control surface, not a code or content change. |

### Docs & notes

| Tool | Classification | Suggested agent(s) | Access | Gate / notes |
|---|---|---|---|---|
| Obsidian vault — Build Log / Agent Log | AGENT-ELIGIBLE | Chief | READ/WRITE, no gate | Logging is Chief's own responsibility per this runbook, not itself a decision. Already proven in practice every session. |
| Obsidian vault — roadmap/decision docs (e.g. Approvals Roadmap) | AGENT-ELIGIBLE | Planner, Chief | PROPOSE-ONLY for new decisions; direct edit only for syncing a doc to an already-established fact (see Planner's Weekly Pass precedent) | A genuine roadmap/phase change still needs a `PlannerApprovalRequest` first. |
| Repo docs (`docs/*.md`, `README.md`) | AGENT-ELIGIBLE | Content, Build | PROPOSE-ONLY via PR; external-facing bits (e.g. README) get their own single-issue card | Content's "external copy — no surprises" rule applies to anything public-facing, including a public README. |
| Notion | HUMAN-ONLY | — | — | Not authorized in this environment; also redundant with Obsidian as the vault of record — no clear need yet. |
| Google Drive | HUMAN-ONLY | — | — | Contents/sensitivity not scoped; revisit if a specific, narrow folder becomes relevant. |

### Dashboards & analytics

| Tool | Classification | Suggested agent(s) | Access | Gate / notes |
|---|---|---|---|---|
| Vercel — deploy status, preview URLs | AGENT-ELIGIBLE | Build | READ-ONLY | Already effectively checked via `gh pr checks`; formalize as read-only. |
| Vercel — env vars, production project settings | HUMAN-ONLY | — | — | Secrets and production config; see Auth/Infra below. |
| Sentry (error tracking) | AGENT-ELIGIBLE | Build, Research | READ-ONLY | Useful for correlating an incident with a Build Health Check finding; no write access needed. |
| Supabase — schema/migrations (via code) | AGENT-ELIGIBLE | Build | PROPOSE-ONLY | Already covered by Build's existing "database or schema migration" gate. |
| Supabase — project console/dashboard (billing, service keys) | HUMAN-ONLY | — | — | Infra/secrets surface, not a code change. |
| Netlify | HUMAN-ONLY | — | — | Deprecated per `README.md` — no reason to wire in inactive infra. |

### External SaaS (tickets, CRM, email, calendar, sites)

| Tool | Classification | Suggested agent(s) | Access | Gate / notes |
|---|---|---|---|---|
| Gmail | HUMAN-ONLY | — | — | Interpersonal comms + inbox PII; too sensitive for even read access right now. |
| Wix (public site, if this is the marketing site) | AGENT-ELIGIBLE | Content | PROPOSE-ONLY | Content's external-copy gate applies directly — draft only, human publishes. |
| Zapier (cross-app automation) | HUMAN-ONLY | — | — | Deliberately unscoped/broad by design — reconsider only for one specific, narrow Zap at a time, not blanket access. |
| Ticketing system (generic — none confirmed in use) | HUMAN-ONLY | — | — | Placeholder category; likely contains customer PII and high-stakes responses. |
| CRM (generic — none confirmed in use) | HUMAN-ONLY | — | — | Same reasoning as ticketing. |
| Calendar (generic — none confirmed in use) | HUMAN-ONLY | — | — | Scheduling mistakes are highly visible and affect other people's time. |
| Airtable, Canva, Microsoft 365, QuickNode, Whimsical | HUMAN-ONLY | — | — | Connected but not yet authorized in this environment; no established True Crew use case yet — revisit individually if one emerges. |

### Auth / infra

| Tool | Classification | Suggested agent(s) | Access | Gate / notes |
|---|---|---|---|---|
| Secrets stores (`INTERNAL_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_WEBHOOK_SECRET`, etc.) | HUMAN-ONLY | — | — | Never agent-writable or agent-readable, by design — these are already write-only/redacted in the platforms that hold them. |
| Deployment environments (Vercel Production project config) | HUMAN-ONLY | — | — | Build already has read-only visibility via deploy status/CI (see Dashboards above) — that's the ceiling for now. |
| Domain / DNS management | HUMAN-ONLY | — | — | No established agent use case; high blast radius if misconfigured. |

---

## Priority candidates for initial agent integration

Ranked by how proven/low-risk they already are, not alphabetically:

1. **GitHub (PRs/CI)** — owner **Build** — `EXECUTE-WITH-APPROVAL` for merge/close, `READ-ONLY` for status. Already working in practice (PR #57–#74) — formalize it as the first officially-wired tool.
2. **Obsidian Build Log / Agent Log** — owner **Chief** — `READ/WRITE`, no gate for logging itself. Already working every session — formalize the scope boundary explicitly: Build Log yes, but any actual roadmap/decision-doc edit still needs the normal Planner gate.
3. **Repo docs (`docs/*.md`, `README.md`)** — owner **Content** (with Build for technical docs) — `PROPOSE-ONLY` via PR, single-issue cards for anything public-facing. Already proven (the README tagline card).
4. **Sentry (read-only)** — owner **Build** or **Research** — `READ-ONLY`. New, low-risk, and pairs naturally with the Daily Build Health Check for real incident correlation instead of just PR hygiene.
5. **Vercel deploy status/preview URLs (read-only)** — owner **Build** — `READ-ONLY`. Mostly already happening ad hoc (`gh pr checks`); formalize as an explicit, bounded read-only integration rather than production/env-var access.

---

## External Services Tool Catalog

David's actual AI/dev tool stack (per `CLAUDE.md`'s tool routing), classified the same way as
the Tool Catalog above. Same rule applies: **nothing here is wired to any agent** — this is
governance only. Nearly all of these (Claude Pro, Perplexity Pro, the free LLMs, Copilot) are
**consumer chat subscriptions, not programmatic APIs** — there is no agent-callable integration
for them today regardless of classification. "AGENT-ELIGIBLE" below means "fine in principle as a
drafting/research input if API access is ever added," not "currently wireable." Vercel, Supabase,
and Cursor are the exceptions — Vercel/Supabase already have real CLI/API surfaces this repo uses,
and Cursor has real evidenced use in this repo's own PR history (many `cursor/*` branches).

| Service | What it is / likely use | Classification | Suggested agent(s) | Access level |
|---|---|---|---|---|
| **Claude Pro** | Consumer chat (claude.ai), separate from Claude Code (this CLI); likely ad-hoc reasoning/drafting outside repo-scale work. | AGENT-ELIGIBLE (in principle) | Research, Content | PROPOSE-ONLY — no agent-callable API today; would need separate Anthropic API credentials |
| **Perplexity Pro** | Live web-search LLM; per `CLAUDE.md`, David's tool for research/current-events questions. | AGENT-ELIGIBLE (in principle) | Research | PROPOSE-ONLY — research notes/citations only, no execution; same no-API-today caveat |
| **Cursor Pro / VS Cursor** | AI-assisted code editor; real, evidenced use in this repo (many historical `cursor/*` PR branches). | AGENT-ELIGIBLE | Build | PROPOSE-ONLY — suggests diffs/PR content; merge/close always goes through Build's existing gate regardless of which tool authored the change |
| **Vercel** | Hosting/deploy platform; already deeply used this session (deploy status, preview URLs, CI checks). | AGENT-ELIGIBLE | Build | READ-ONLY for deploy status/preview URLs (already effectively how it's used); PROPOSE-ONLY for config changes; `EXECUTE-WITH-APPROVAL` only if a future explicit deploy gate is added to this runbook — not defined yet |
| **Supabase** | Postgres DB + migrations; real, extensively used this session (e.g. `chief_approval_decisions`). | AGENT-ELIGIBLE | Build | READ-ONLY for schema/status; PROPOSE-ONLY for migrations — already covered by Build's existing "database or schema migration" gate |
| **free ChatGPT** | Per `CLAUDE.md`: manual overflow chat when Claude credits are low, or a quick second opinion. | AGENT-ELIGIBLE (in principle) | Research, Content | PROPOSE-ONLY — same no-API-today caveat |
| **free Kimi** | Same category as ChatGPT — manual overflow/second-opinion chat. | AGENT-ELIGIBLE (in principle) | Research, Content | PROPOSE-ONLY — same caveat |
| **free DeepSeek** | Same category — manual overflow/second-opinion chat. | AGENT-ELIGIBLE (in principle) | Research, Content | PROPOSE-ONLY — same caveat |
| **free Gemini** | Per `CLAUDE.md`: large-context or multimodal tasks. | AGENT-ELIGIBLE (in principle) | Research, Content | PROPOSE-ONLY — same caveat |
| **free Copilot** | Per `CLAUDE.md`, explicitly: "only if already surfaced inside Office/Windows tools; **not wired into this dev environment**." | **HUMAN-ONLY** | — | — |

Note on Copilot: unlike Cursor, `CLAUDE.md` explicitly states Copilot isn't part of this repo's
active coding workflow — classified HUMAN-ONLY on that basis (least privilege + not currently
relevant), not bundled in with Cursor just because both are "IDE coding assistants."

### Priority candidates from this list (3–5)

1. **Build ↔ Vercel, READ-ONLY** — deploy status/preview URLs. Gate: none needed for reading; any config or production change stays HUMAN-ONLY until a deploy-specific gate is written.
2. **Build ↔ Supabase, READ-ONLY (schema) / PROPOSE-ONLY (migrations)** — already Build's existing "database or schema migration" gate covers this; no new rule needed, just formalize the tool as in-scope.
3. **Build ↔ Cursor, PROPOSE-ONLY** — Cursor drafts a diff/PR; the existing Build gate ("code change merging to main") governs whether it merges, same as any other PR regardless of authorship tool.
4. **Research ↔ Perplexity Pro, PROPOSE-ONLY** — once API access exists: Research uses it for live web research, output is always a note or a `ResearchApprovalRequest`, never an executed action.
5. **Research/Content ↔ a model-provider API (Claude/Gemini), PROPOSE-ONLY** — once real API credentials are provisioned (separate from the consumer subscriptions above): drafting only, routed through the normal `ResearchApprovalRequest`/`ContentApprovalRequest` path like any other agent output.
