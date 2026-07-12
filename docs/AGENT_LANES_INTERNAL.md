# Internal Agent Lanes — Chief, Research, Filing/Second Brain

> [LEGACY-FROZEN] This document describes a legacy lane model
> (Chief/Research/Filing) for the second brain. It remains authoritative
> per docs/OPERATIONS/AGENT_LANE_RECONCILIATION_PLAN.md, which tracks its
> relationship to the newer Chief/Build/Filing shelf lanes as unresolved.

Practical, single-place lane definitions for the three agents that touch the second
brain most directly. This doc doesn't redefine anything in
[docs/AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) or
[docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md](RESEARCH_SECOND_BRAIN_WORKFLOW.md) — it
restates their existing rules in one referenceable place so a new session can orient
in one read. Where this doc and those disagree, the runbook and workflow doc win;
fix this doc, not the disagreement.

No new permission, gate, or automation is introduced here.

---

## Chief (Claude Pro)

**Startup Behavior:**
1. Run the Chief Intake Rule (AGENT_RUNBOOK § Chief Intake Rule) — read `knowledge/MEMORY.md`,
   the Master Priority List, Current Priority List, and active-task doc, in that order —
   before planning or executing anything.
2. Open the response with the required intake structure (Priority served / Current
   Task / Why this work belongs here / Out-of-scope ideas).
3. Treat AGENT_RUNBOOK.md and the repo docs as the only live inputs — do not query
   `knowledge/` directly (see Must NOT below).
4. If this session includes a Memory Review Pass, run its steps in full, including
   the Lesson expiry check — it's not a separate, optional add-on.

**Responsible for:**
- Converting every agent's approval request into an `ApprovalCard` (AGENT_RUNBOOK §
  Chief).
- Approving/holding/rejecting via the operator's decision only — never deciding
  unilaterally.
- Rule changes to this repo's governance docs go through the same PR + review path as
  any other change (AGENT_RUNBOOK § Change Control) — Chief doesn't edit them
  unilaterally either.
- Enforcing the **Lesson expiry check** during each Memory Review Pass (see
  AGENT_RUNBOOK § Memory Review Pass and § Lessons) — flagging any lesson that's gone
  three consecutive passes uncited for re-evaluation.
- Owning (by coordinating Research + Content, not writing directly) the Second Brain
  Starter Pass and Memory Review Pass.

**Must NOT:**
- Edit runtime/application code. Chief is the approvals router and summarizer, not a
  code-editing agent (AGENT_RUNBOOK § Chief: "Purpose: Approvals router and
  summarizer").
- Write directly to `knowledge/`. Chief *coordinates* the Second Brain Starter Pass;
  Research and Content are "the two agents doing the actual reading/writing"
  (AGENT_RUNBOOK § Second Brain Starter Pass).
- Query the second brain store directly as a live data source. Chief's real-time
  inputs are AGENT_RUNBOOK + the repo docs (see § Chief and the second brain in
  `RESEARCH_SECOND_BRAIN_WORKFLOW.md`) — filed research reaches Chief only indirectly,
  via the operator folding it into runbook updates or prompt context.
- Bypass or auto-execute a card decision (approve/reject stays a human decision,
  AGENT_RUNBOOK § Chief Rules).

**Inputs read before acting** (AGENT_RUNBOOK § Chief Intake Rule):
1. `knowledge/MEMORY.md`
2. `True Crew/Master Priority List.md`
3. `01_DASHBOARD/Current Priority List.md`
4. The active-task doc
5. AGENT_RUNBOOK.md itself, and any doc a pending card references

**Required outputs at end of session:**
- The opening intake structure (Priority served / Current Task / Why this work
  belongs here / Out-of-scope ideas) on every response, per Chief Intake Rule.
- Any `ApprovalCard` outcomes logged to the Chief Audit log.
- A Build Log / `knowledge/log.md` entry for any notable action, including Memory
  Review Pass results (status changes, merges, and **lesson-expiry flags**).
- A decision note (`knowledge/decisions/*.md`) only when the Second Brain Starter Pass
  actually produces one — not required every session.

---

## Research (Claude Pro)

**Startup Behavior:** begin at step 1 of the Standard workflow below (question
framing) — don't skip to source discovery on an unscoped question. Before filing
anything, re-check `RESEARCH_SECOND_BRAIN_WORKFLOW.md` § "What deserves filing" and §
Filing tiers rather than assuming the same tier as a prior session's similar finding.

**Standard workflow** (AGENT_RUNBOOK § Research Agent, iterative-by-default loop):

1. **Question framing** — what's actually being asked, scoped narrowly enough to
   verify.
2. **Source discovery** — real sources, not memory; single-pass only for trivial,
   one-answer lookups.
3. **Evidence logging** — cite what was actually checked (AGENT_RUNBOOK: "Claims
   checked against actual docs, not memory").
4. **Critique → gap-fill** — poke holes in the first pass, chase what critique
   surfaces.
5. **Synthesize → verify** — one clear answer, re-checked against sources before
   hand-off.
6. **Lessons vs. Logs vs. Starter-Pass decision** — per
   `RESEARCH_SECOND_BRAIN_WORKFLOW.md` § Filing tiers, decide Tier 1 (Log, always
   allowed), Tier 2 (Lesson, Research's own narrow write exception), or Tier 3
   (Starter-Pass-candidate, flagged only).
7. **Intake-ready output** — write the finding once, in the fixed-field
   `Research Finding Intake` shape (`docs/OBSIDIAN_RESEARCH_INTAKE.md`), and hand it
   to the Filing lane.

**What counts as a valid Lesson** (AGENT_RUNBOOK § Lessons — "Policy: what becomes a
lesson"): confirms a success pattern, flags a failure pattern, reveals a durable
constraint, documents a recovery pattern, or sharpens a research/orchestration
pattern. A finding that only restates or confirms something already in `knowledge/`
does not clear the bar.

**Starter-Pass-candidate flags:**
- Research may **flag** a finding as a Starter-Pass-candidate; it never creates the
  page itself (`RESEARCH_SECOND_BRAIN_WORKFLOW.md` § Filing tiers — "Tier 3 is a flag,
  not a write").
- **Graduation rule** (unchanged, carried from `RESEARCH_SECOND_BRAIN_WORKFLOW.md`):
  promote a finding to Starter-Pass-candidate only after it has been validated by a
  working implementation OR cited in at least two separate build sessions.
- Only the next Second Brain Starter Pass (Chief, coordinating Research + Content)
  actually creates the `sources/`/`concepts/`/`projects/`/`decisions/` page.

**Hand-off to Filing:**
- Research fills in the `Research Finding Intake` template
  (`docs/OBSIDIAN_RESEARCH_INTAKE.md`) — ID, date, sources, finding,
  worked/failed/next-time, tier, dedupe check, destination — and hands the completed
  block to the Filing lane.
- Research does not file the note itself beyond its own narrow Tier 1/2 write
  exception (`knowledge/log.md`, `knowledge/lessons/*.md`) — anything else routes
  through Filing.

---

## Filing / Second Brain (Claude Code)

**Startup Behavior:**
1. State plainly whether this is a cloud or local session, before filing anything —
   it determines whether live Obsidian vault destinations are even reachable (see
   Scope below).
2. Read the completed `Research Finding Intake` payload as given; don't invent or
   infer a missing field (Tier, Destination) — send it back for completion instead.
3. Run the dedupe check (`OBSIDIAN_RESEARCH_INTAKE.md` § Dedupe) before writing
   `Lesson` or `Starter-Pass-candidate` tier — never before `Log` tier, which needs
   none.

**Scope:**
- Read existing rules and findings across `knowledge/` and the repo docs before
  writing anything (`OBSIDIAN_RESEARCH_INTAKE.md` § Dedupe: update vs. new note).
- Create or update `knowledge/` files strictly per the tier→destination mapping in
  `OBSIDIAN_RESEARCH_INTAKE.md` — `log.md` (Log), `lessons/*.md` (Lesson),
  `inbox/*.md` (Starter-Pass-candidate flag).
- Append to the live Obsidian vault (Build Log / Agent Log) **only when asked, and
  only from a local session** with `OBSIDIAN_VAULT_PATH` set — a cloud session cannot
  reach the live vault and must never claim to have written to it
  (`docs/OBSIDIAN_LOGGING.md`; `OBSIDIAN_RESEARCH_INTAKE.md` § Who produces, who
  files, who approves).

**Actions:**
- File a completed `Research Finding Intake` payload to its named destination,
  unchanged in substance.
- Create or update `knowledge/lessons/*.md` files, using the lesson template
  (`title`/`status`/`confidence`/`source_workflow`/`source_agent`/`category`, then
  **Rule / Why / Apply when / Avoid when / Check first**, per AGENT_RUNBOOK §
  Lessons) — prefer sharpening an existing lesson over adding a near-duplicate.
- Maintain `knowledge/index.md` and, when something newly belongs in the curated
  "check-first" set, `knowledge/MEMORY.md` — as part of the Second Brain Starter
  Pass, not ad hoc.

**Guardrails:**
- No runtime/application code changes — docs and `knowledge/` only.
- No new permission or automation — filing is a manual act performed by a Claude Code
  session today; there is no CLI command or scheduled job that files a note
  automatically (`OBSIDIAN_RESEARCH_INTAKE.md` § Guardrails).
- No direct "Chief" decisions — Filing never approves, rejects, or recommends a card
  decision; it only writes what a completed intake payload or an already-decided
  Memory Review outcome says to write.
- Never writes `knowledge/concepts/`, `knowledge/projects/`, `knowledge/decisions/`,
  or `knowledge/sources/` directly — those remain Second Brain Starter Pass-only.

---

## Quick reference: who writes what

| Destination | Who may write it | Gate |
|---|---|---|
| `knowledge/log.md` | Research, Filing, any agent | None |
| `knowledge/lessons/*.md` (new or update) | Research (narrow exception), Filing | None |
| `knowledge/inbox/*.md` | Filing | None (flag only, not a durable page) |
| `knowledge/concepts/`, `projects/`, `decisions/`, `sources/` | Second Brain Starter Pass only (Chief-owned, Research/Content-executed) | None internal; external-facing content always routes to Content's `ApprovalCard` path instead |
| Live Obsidian vault (Build Log, Agent Log, Decisions) | Filing, local session only | None, but local-only |
