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
- Risks and trade-offs are listed, not just the upside
- Scoped against actual Build capacity, not aspirational

**Approval request → card:** create a `PlannerApprovalRequest` — `gate`, `summary`, `riskLevel`,
`testsOrChecksDone`, `requestedAction`, `affectedPhases`, `createdAt` — through
`createApprovalCardFromPlannerRequest()`.

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

**Approval request → card:** create a `BuildApprovalRequest` — `gate` (`BuildApprovalGate`),
`summary`, `riskLevel`, `testsOrChecksDone`, `requestedAction`, `filesOrAreas`, `createdAt`,
optional `title` override — through `createApprovalCardFromBuildRequest()`. Live example:
`BUILD_REQUEST_DUPLICATE_AUTH_FIX` (PR #57 vs #58) — use it as the template for real requests.

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
- **Steps:** read the Build Log and current roadmap doc (`Chief/Approvals Roadmap.md`, `01_DASHBOARD/Current Priority List.md`); check what's shipped since the last pass; draft updated slice/priority notes.
- **Agent owner:** Planner.
- **Good output:** one short planning note (Obsidian) **plus 1–3 `ApprovalCard`s at most** — only for roadmap changes that genuinely need the operator's judgment.
- **Auto-resolvable (log only, no card):** slice/priority notes refreshed within an existing tier; re-confirming a phase's status is unchanged; minor wording fixes to plan docs.
- **Needs approval:** changing which tier a feature/phase sits in; adding or removing a major feature or phase; anything altering an operating-model constraint.
- **Logging:** Build Log entry noting what was refreshed and what's unchanged; if a card was created, link it.

### Daily Build Health Check
- **Purpose:** catch stale, duplicate, or drifting PRs/branches before they pile up (the #57/#58 pattern).
- **Steps:** `gh pr list --state open`; scan for duplicates, stale branches, or PRs blocked on an unmet precondition; do not edit code or merge/close anything directly.
- **Agent owner:** Build.
- **Good output:** one repo-health summary **plus 0–3 `ApprovalCard`s at most** — only for changes that actually require clearance.
- **Auto-resolvable (log only, no card):** lint/format-only fixes on a branch that hasn't merged yet; informational stale-branch or duplicate-PR flags with nothing to decide yet; routine Build Log updates.
- **Needs approval:** merging or closing any PR; any migration or schema change; any security/auth or external-API change; any production-impacting refactor.
- **Logging:** Build Log entry listing what was scanned and what (if anything) surfaced as a card.

### Weekly Research Scan
- **Purpose:** stay current on tools/integrations relevant to True Crew without committing to any of them.
- **Steps:** compare at least two options against the current stack (per `CLAUDE.md`'s tool routing and `package.json`); note cost, maintenance burden, and fit; write up facts vs. guesses per the `truecrew-research` skill.
- **Agent owner:** Research.
- **Good output:** one 1-page comparison note **plus at most 1 `ApprovalCard`** — only if the scan concludes with an actual adopt/drop recommendation.
- **Auto-resolvable (log only, no card):** cataloging options; cost/maintenance-burden comparisons; anything that stops at "here's what exists," not "we should switch."
- **Needs approval:** recommending adoption or removal of a tool or vendor; recommending a stack change that would affect Build or production.
- **Logging:** Build Log or Agent Log entry with the comparison and, if applicable, the card link.

### Weekly Content Tidy
- **Purpose:** keep internal docs, Agent Logs, and approval notes readable — not a publishing pass.
- **Steps:** review the week's Build Log/Agent Log entries and recent approval card summaries; consolidate, fix inconsistent terms, remove stale TODOs; draft cleaner versions.
- **Agent owner:** Content.
- **Good output:** cleaned notes/docs **plus at most 1 bundled `ApprovalCard`** for internal items that need sign-off. External-facing findings are exempt from this cap — see "External copy — no surprises": each one gets its own single-issue card, never folded into the ≤1 internal card or capped alongside it.
- **Auto-resolvable (log only, no card):** internal doc cleanup; fixing typos/broken links in internal notes; consolidating duplicate internal notes; standardizing terminology across logs.
- **Needs approval:** any copy that ships to clients or the public (own single-issue card, always); legal/terms/privacy/support-policy wording (same); critical UI wording (same).
- **Logging:** Build Log entry noting what was tidied, and confirming no external-facing item was bundled.

### Chief Weekly Digest
- **Purpose:** give the operator one summary of the week's approval activity instead of requiring them to scroll the Audit log.
- **Steps:** summarize cards resolved this week (approved/sent back/rejected), list what's still pending, and flag anything the stale-pending badge has already caught.
- **Agent owner:** Chief.
- **Good output:** one digest note. No cards of its own — see **Approval Load** below for how Chief handles a backlog of pending cards surfaced by other workflows.
- **Approval gate:** none — this is reporting, not an action; nothing here changes state.
- **Logging:** Build Log entry with the digest, so it's part of the same record as everything else.

### Research–Planner–Build Correlation Pass
- **Purpose:** catch overlaps where a Research recommendation, a Planner roadmap item, and Build's actual code/PRs disagree or duplicate effort on the same capability — before the operator discovers the conflict after the fact.
- **Owner:** Chief.
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
- **Gate:** none for detection itself; whatever the correlated finding touches (roadmap, code, external copy) still goes through that agent's normal gate.
- **Logging:** every pass writes a Build Log entry with the number of overlaps found, the number of high-impact cards created, and any items deferred to the digest.

### Second Brain Starter Pass
- **Purpose:** turn work David already produces — Build Log entries, Agent Runbook sections, PRs, ApprovalCard outcomes, audits, status checks — into a durable internal knowledge base (`knowledge/`), without requiring David to take notes himself.
- **Owner:** Chief, coordinating Research (synthesis/comparison instincts) and Content (clear writing, terminology consistency) as the two agents doing the actual reading/writing. Build is a **source provider only** in this workflow — it doesn't write vault pages itself, it's where PRs/code-facts come from.
- **Gate:** none for internal knowledge maintenance (ingesting, creating, or updating a `sources/`/`concepts/`/`projects/`/`decisions/` page is routine, reversible, internal work). An `ApprovalCard` is required only if a change would affect **external-facing docs** (none should live in `knowledge/` — see Knowledge Maintenance below) or amounts to a **major structural change to the vault itself** (e.g. renaming/removing a top-level folder, changing the front-matter schema) — that's a Build-style "changes to approval-related UX or logic"-adjacent structural change, not a content update.
- **Steps:**
  - **A. Collect inputs** — the latest Build Log entries since the last pass; current Agent Runbook sections relevant to what happened; recent important PRs; recent `ApprovalCard` outcomes (approved/declined/pending); notable summaries (a dashboard audit, a Vercel status check, an Approval Load rule change).
  - **B. Ingest** — for each real artifact, create a `sources/` note (or update an existing one — search first, per Knowledge Maintenance below) capturing what it actually said; create or update the relevant `projects/` page(s) with what changed.
  - **C. Synthesize** — fold durable ideas into `concepts/` pages (established facts vs. open questions, kept separate); create or update a `decisions/` page for anything that was, or needs to be, decided, with status marked `approved`/`pending`/`declined`.
  - **D. Index and log** — refresh `knowledge/index.md` so new/changed pages are actually reachable; append one line per change to `knowledge/log.md`.
  - **E. Report** — a short summary back to David: what was added/updated, nothing else. No raw chat dump, no full page contents pasted into the conversation — the vault itself is the artifact.
- **Good output:** updated/new pages under `knowledge/`, an index refresh, and a log append — **no cards** unless the gate above is actually hit.
- **Auto-resolvable (log only, no card):** everything in the normal case — new source notes, concept/project/decision page updates, terminology cleanup, re-indexing.
- **Needs approval:** a page that would put external-facing copy in the vault (redirect it to Content's normal external-copy path instead — it doesn't belong in `knowledge/` at all); a rename/removal/schema change to the vault's top-level structure.
- **Logging:** Build Log entry summarizing the pass (what was collected, what was created/updated, counts by type) **and** the corresponding lines in `knowledge/log.md` — the Build Log is the session record, `knowledge/log.md` is the vault's own append-only ledger; a real pass writes both.
- **Triggering it (for David):** ask Chief by name — e.g. "Ask Chief for a Second Brain Starter Pass" or "Ask Chief to ingest this week's dashboard work into the knowledge base." Nothing runs on a timer. Expect back a short summary of pages added/updated — not a raw chat dump, not full page contents pasted inline — plus an `ApprovalCard` only if the pass hits the gate above (external-facing content, or a structural vault change).

**How Chief handles it, every time:** whichever workflow ran, any `*ApprovalRequest` it produced goes through the usual `createApprovalCardFrom*Request()` path and shows up in Chief → Approvals like any other card — a workflow is just another way a request gets created, not a separate approval path.

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
- **Concept pages separate fact from inference.** Every `concepts/` page keeps
  "Established facts" (verified against code/docs/PRs) and "Open questions / inference"
  (assumed, uncertain, or not independently checked) as distinct sections — never
  merged into one undifferentiated summary.
- **Decision pages always carry a status.** Every `decisions/` page states plainly
  whether it is `approved`, `pending`, or `declined` — a decision page with no status,
  or a stale one, is worse than no page at all.
- **Every update appends to the log.** Any create/update to a page under `knowledge/`
  gets one line appended to `knowledge/log.md` — no exceptions for "minor" edits.
- **No external-facing content lives here.** `knowledge/` is an internal vault. Content
  that would ship to clients or the public still follows the normal
  `ContentApprovalRequest` / "external copy — no surprises" path — it is never drafted
  or stored under `knowledge/` even as a draft.
- **Search before you write.** This is the same rule as "prefer updating over
  duplicating," stated as a habit: check first, write second.

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
