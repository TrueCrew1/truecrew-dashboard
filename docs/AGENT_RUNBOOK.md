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

**How Chief handles it, every time:** whichever workflow ran, any `*ApprovalRequest` it produced goes through the usual `createApprovalCardFrom*Request()` path and shows up in Chief → Approvals like any other card — a workflow is just another way a request gets created, not a separate approval path.

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
