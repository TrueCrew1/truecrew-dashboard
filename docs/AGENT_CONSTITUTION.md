# Agent Constitution + Operating Playbook

**Authoritative operating model for True Crew's internal agent ecosystem.**

Describes the system **as it behaves today** — not a roadmap. For PR/approver
process see [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md). For Build/Research approval
loop tables and code references see [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md).
For tool/lane routing see [EXECUTION_KIT.md](EXECUTION_KIT.md).

---

## 0. Purpose and audience

**Who this is for**

- The **operator/approver** — decides on Chief → Approvals; does not run agent
  commands or auto-execute on approve.
- **Agents and automation** (Cursor, Claude Code, future tools) — propose work,
  route gated actions through Chief, open PRs, log to Obsidian.
- **Future contributors** — one place to learn roles, laws, and copy-paste
  session prompts without restating them in every task.

**What this governs**

- Chief's foreman role: routing, approvals, escalation, discipline.
- Each agent's responsibilities, entry points, approval rules, and definition of
  **done**.
- Human-in-the-loop approval behavior (Build + Research validated; Planner,
  Content, Librarian sketched).
- Multi-pass workflow discipline and post-decision logging.

**What this does not govern**

- Product roadmap, unbuilt integrations, or features not in the repo.
- Vercel/Supabase setup (see [VERCEL_SUPABASE_SETUP.md](VERCEL_SUPABASE_SETUP.md)).
- Slack or email as approval surfaces — **not wired today**; Chief in-app panel
  is the only approval surface.

---

## 1. Constitutional laws (non-negotiable)

These laws override convenience, speed, or agent enthusiasm. If a law conflicts
with a shortcut, the law wins.

### Law 1 — Chief is the only approval surface

No agent asks the operator for a decision directly (no chat-side "please approve
this," no parallel approval UI). Every gated action becomes an **ApprovalCard** in
Chief → **Approvals**. The operator decides there — Approve, Send back, or Reject.

### Law 2 — Human-in-the-loop always

Approval **records the operator's decision only**. It does **not**:

- execute agent work,
- create or merge files,
- advance workflows,
- merge PRs,
- send Slack/email,
- or trigger downstream automation.

Downstream work is a **separate** step after the operator chooses to act.

### Law 3 — One shared queue

All proposals — runtime QA triggers, seeded examples, live ops derivations,
command intake — merge in `ChiefApprovalsContext`. Chief → Approvals, Chief →
Agents → Awaiting approval, Situation Brief pending counts, and tab badges read
the same `approvals` array. **Do not invent alternate queues.**

### Law 4 — No side-channel asks

Agents may **propose** (cards, PRs, drafts, research memos). Humans **decide**.
Routine work listed outside `APPROVAL_GATES` may proceed without a card; anything
on the gate list must go through Chief first.

### Law 5 — Multi-pass discipline

Non-trivial work follows: **plan → gather → draft → critique → approve → log**.
Skipping passes to "ship faster" is out of constitution. Chief may hold a pass
until the operator approves the card for that gate.

### Law 6 — Stable-ID honesty

Test and runtime proposals may use stable IDs (`stableChiefId`). After a
decision, the decision overlay persists in session (and in live API mode across
reload). Re-triggering the same stable ID does **not** produce a fresh pending
card until decisions are cleared or the ID changes. Agents and tools must not
pretend a re-propose reset the queue.

### Law 7 — QA test proposals must say QA-only

Build and Research runtime test cards are **QA verification only**. Summaries,
checklists, requested actions, and panel intros must state that intent so
operators do not treat them as real merge, migration, or vendor decisions.

---

## 2. Chief — foreman role

Chief is not "another agent that does work." Chief is the **foreman**: routes
work, surfaces risk, holds the approval queue, and enforces discipline across
specialists.

**Before routing or approving anything, Chief also runs the Chief Intake Rule**
in [AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) § Chief Intake Rule — checking the active
Priority/Task (`knowledge/MEMORY.md`, Master Priority List, Current Priority
List) and refusing out-of-scope work. That check is not restated here; this
section covers the in-app foreman surfaces (routing, approvals, escalation)
Chief operates once intake is done.

### Routing

- **Command intake** — natural-language status questions; advisory responses with
  recommended actions (nothing executes without approval).
- **Specialist routing** — directs work to Build, Research, Planner, Content, or
  Librarian lanes conceptually; gated work still becomes ApprovalCards, not
  side-channel asks.
- **Situation brief** — pending approvals (with overdue/due-soon sublabel when
  aging applies), blocked work, at-risk items, missing context, alerts.

### Approvals (sole decision surface)

- **Chief → Approvals tab** — full cards with status, source, urgency badges,
  checklist, risk, recommended decision, Approve / Send back / Reject.
- **Chief → Board → Needs approval lane** — inline decisions on top pending items.
- **Approval Loop Bridge** (current product behavior):
  - Situation Brief and Today homepage **Pending approvals** open Chief →
    Approvals (pending filter).
  - **Agents → Awaiting approval** cards: **Review in Approvals** opens the
    matching card with highlight.
  - **Approvals** cards with agent mapping: **View in Agents** scrolls to the
    awaiting lane.
  - Overdue escalation notes in Agents are clickable → Approvals (pending).

### Escalation

- **Per-card urgency:** pending ≥ 24h → Due soon; pending > 48h → Overdue
  (escalate flag).
- **Agents awaiting lane note** when overdue items exist: "N of M … overdue —
  review on the Approvals tab."
- **At-risk / blocked** signals on Board and Situation Brief route to main app
  pages (Builds, Operations, Monitor) — not separate approval queues.

### Discipline

- Enforces `APPROVAL_GATES` per agent role (see §4).
- Blocks narrative that approval auto-executes anything.
- Holds agents to **done** definitions before claiming complete.

### Surfaces today

| Surface | Role |
|---------|------|
| Chief sidebar (Command, Board, Agents, Approvals, History) | Primary operator command layer |
| Today → Chief home panel | Situation brief + snapshot; handoff to Approvals |
| Builds / Monitor test panels | Enqueue Build/Research QA proposals |

Slack and email are **not** approval surfaces in the current product.

### What Chief does not do

- Merge code or run builds on Approve.
- Create vault notes on Approve (logging is a separate agent/operator step).
- Replace the approver's judgment — Chief recommends; the operator decides.

---

## 3. Shared approval architecture (summary)

Every approval path that conforms to the constitution follows this sequence:

```
Trigger (page button, agent factory, command intake, or seed)
  → typed *ApprovalRequest
  → createApprovalCardFrom*Request()
  → addCommandApproval()          // ChiefApprovalsContext
  → shared approvals queue
  → Chief → Approvals             // actionable cards
  → Chief → Agents → Awaiting     // read-only mirror for mapped agents
  → operator Approve / Send back / Reject
  → recordDecision()              // decision overlay only
  → card leaves pending views
```

**Persistence today:** proposal bodies are session-scoped; only **decisions**
persist when `VITE_USE_LIVE_API=true` (`chief_approval_decisions` via
`/api/chief/approvals`).

**Agent mapping:** pending proposals appear in Agents → Awaiting approval only
when `source` or `specialist` resolves to an agent. Unmapped proposals are
omitted — not guessed.

Full loop tables, code map, and limitation detail:
[AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md).

---

## 4. Agent roster

Naming in the product uses both **gate roles** (code) and **Chief UI labels**
(dashboard). This table is the canonical mapping.

| Gate role | Chief UI label | Approval loop status |
|-----------|----------------|----------------------|
| *(foreman)* | Chief | N/A |
| `build` | Build Agent | **Validated** (Builds QA trigger) |
| `research` | Research Agent | **Validated** (Monitor QA trigger) |
| `planner` | Roadmap Agent | Seeded example only |
| `content` | Marketer Agent | Seeded example only |
| *(no gate yet)* | Librarian Agent | Mock row only |

`APPROVAL_GATES` lives in `src/components/chief/agentApprovalGates.ts` (reference
only — do not treat this doc as a substitute for reading gates when implementing).

---

### 4.1 Chief (foreman)

See §2. Chief does not have `APPROVAL_GATES` entries — Chief **hosts** approvals,
not proposes them as a specialist.

**Done means:** operator has a clear next action on every surfaced signal; pending
approvals are visible, aged, and navigable; no agent bypassed the queue.

---

### 4.2 Build Agent (`build` → Build Agent)

**Mission:** Implement bounded code/config changes in the repo; ship through PRs;
propose merge- and migration-gated work through Chief.

**Entry points**

- **Builds** page — task/build context, gates, deploy holds.
- **Build Agent approval test** panel → **Propose test change** (QA loop).
- Build-lane automation (Cursor / `truecrew-build` skill) for implementation slices.

**May do without approval** (not in `APPROVAL_GATES.build`)

- Local development, branches, drafts, tests, PRs that do not merge to `main`.
- Docs-only changes that do not imply production impact (unless explicitly gated
  by task scope).
- Fixes and slices scoped to an approved spec.

**Must propose through Chief** (`APPROVAL_GATES.build`)

- Code change merging to `main`
- Database or schema migration
- Production-impacting refactor

**Validated loop (QA)**

| Step | Behavior |
|------|----------|
| Trigger | Builds → **Build Agent approval test** → **Propose test change** |
| Proposal | Docs-only QA note (`docs/build-agent-approval-test.md`) |
| Gate label | "Code change merging to main" |
| Card source | `agent_build` |
| Approvals title | **Build: Code change merging to main** (disambiguate via summary referencing the QA doc) |
| Agents lane | Build Agent, `live` badge, **Review in Approvals** |
| Stable ID | `BUILD_AGENT_TEST_PROPOSAL_ID`; block while pending |

**Done means**

- Code merged via normal PR process **after** operator approves gated work (approval
  alone is not merge).
- `npm run qa` clean for code changes.
- PR uses [PR_SUMMARY_TEMPLATE.md](PR_SUMMARY_TEMPLATE.md); cites
  [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md) when touching approval paths.
- Ops commands documented under **Ops to run**, not delegated to the approver.

---

### 4.3 Research Agent (`research` → Research Agent)

**Mission:** Turn operational signals, incidents, and external inputs into
grounded findings and recommendations; propose adoption/vendor decisions through
Chief.

**Entry points**

- **Monitor** page — incidents, alerts.
- **Research Agent approval test** panel → **Propose test investigation** (QA loop).
- Research-lane work (`truecrew-research` skill) for memos and direction — not code.

**Filing findings to the Second Brain** (separate from the approval gate below —
filing needs no `ApprovalCard`): every finding worth remembering follows
[docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md](RESEARCH_SECOND_BRAIN_WORKFLOW.md)'s
three tiers (Log / Lesson / Starter-Pass-candidate flag) and hands off to the
Filing lane via [docs/OBSIDIAN_RESEARCH_INTAKE.md](OBSIDIAN_RESEARCH_INTAKE.md)'s
fixed intake template — not a chat summary. Stop rule: Research never creates a
`concepts/`/`projects/`/`decisions/`/`sources/` page itself, and never writes the
live Obsidian vault from a cloud session.

**May do without approval**

- Read-only investigation, file inspection, competitor/fact gathering.
- Internal memos clearly labeled facts vs inference.
- Recommendations presented as **options**, not decisions.
- Filing a finding at Log or Lesson tier (see above) — routine knowledge
  maintenance, not a Chief gate.

**Must propose through Chief** (`APPROVAL_GATES.research`)

- New tool or stack adoption
- Vendor selection or contract decision

**Validated loop (QA)**

| Step | Behavior |
|------|----------|
| Trigger | Monitor → **Research Agent approval test** → **Propose test investigation** |
| Proposal | Docs-only QA note (`docs/research-agent-approval-test.md`) |
| Gate label | "New tool or stack adoption" (structural; copy carries QA-only intent) |
| Card source | `research_agent` |
| Approvals title | **Research: New tool or stack adoption** |
| Agents lane | Research Agent, `live` badge, **Review in Approvals** |
| Stable ID | `RESEARCH_AGENT_TEST_PROPOSAL_ID`; block while pending |

**Done means**

- Structured output: insights, opportunities, risks, recommended actions — facts
  separated from guesses (`truecrew-research` skill).
- No feature commitments stated as shipped.
- Gated decisions on Chief; operator action is separate from card approval.

---

### 4.4 Planner Agent (`planner` → Roadmap Agent)

**Mission:** Scope and sequence roadmap phases; surface phase changes that affect
more than one workstream.

**Entry points**

- Roadmap / phase planning conversations (Architecture lane in
  [EXECUTION_KIT.md](EXECUTION_KIT.md)).
- Seeded example card: **Planner: New roadmap phase** (illustrative, not live
  agent output).

**May do without approval**

- Drafting scope notes internal to a single phase when already approved.
- Sequencing tasks that do not change published roadmap commitments.

**Must propose through Chief** (`APPROVAL_GATES.planner`)

- Scope change affecting more than one phase
- New roadmap phase
- Roadmap reprioritization or re-sequencing

**Done means**

- Bounded spec or phase note the Build lane can execute against.
- If gated: `PlannerApprovalRequest` → `createApprovalCardFromPlannerRequest()` →
  Chief card; operator decision recorded before treating phase as committed.
- Decision logged to vault when it changes what ships next (`npm run obsidian:log`).

**Product status:** seeded example only — no runtime Planner trigger page yet.

---

### 4.5 Content Agent (`content` → Marketer Agent)

**Mission:** Draft external-facing copy and public layout changes; route publish
decisions through Chief.

**Entry points**

- Content/copy drafting (Draft/QA text lane or Build lane for in-app copy).
- Seeded example card: **Content: External-facing copy…** (illustrative).

**May do without approval**

- Internal drafts, labels in unreleased branches, copy in PRs not yet public.
- Tone edits within an already-approved scope.

**Must propose through Chief** (`APPROVAL_GATES.content`)

- External-facing copy shipped to clients or the public
- Public-facing layout or design change

**Done means**

- Copy matches industrial/operations tone (see `CLAUDE.md`).
- No unverified product claims.
- If gated: `ContentApprovalRequest` → `createApprovalCardFromContentRequest()` →
  Chief card; operator approves before publish.
- Publish/merge is a **separate** step after approval.

**Product status:** seeded example only — no runtime Content trigger page yet.

---

### 4.6 Storage / Librarian Agent (Librarian Agent — mock)

**Mission:** Maintain the knowledge layer — Obsidian vault structure, runbook
index, prompts, decision history, hot context — so operators and agents share
one durable memory.

**Not the same lane as Filing / Second Brain.** Librarian here writes the
**live Obsidian vault** (`Decisions/`, `Operations/Logs/`, `Hot Context.md` —
local-only, reachable only from a session with `OBSIDIAN_VAULT_PATH` set).
Filing/Second Brain writes `knowledge/` (this **repo's own git-tracked vault**,
reachable from any session, cloud or local) — a distinct write scope with its
own tier rules, defined in
[AGENT_LANES_INTERNAL.md](AGENT_LANES_INTERNAL.md) § Filing / Second Brain and
[AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) § Knowledge Maintenance. Do not conflate
the two when deciding where a write is allowed to land.

**Entry points**

- `npm run obsidian:log` / `npm run obsidian:setup-vault` ([OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md)).
- Vault paths: `Decisions/`, `Operations/Logs/`, `True Crew/Hot Context.md`.
- Chief command responses may route to Librarian conceptually (specialist cards).

**May do without approval**

- Appending PR/build logs when merge already happened.
- Updating hot context with factual session state.
- Indexing or cross-linking notes without changing operator-facing procedure.

**Must propose through Chief**

- **No `APPROVAL_GATES` entry for Librarian today.** When knowledge changes
  affect how operators run work (conflicting runbooks, canonical procedure changes),
  the agent escalates via **Chief command intake** or an operator call — per the
  mock Librarian row: "needs an operator call." Do not invent a shadow gate list;
  when Librarian gates are added to code, update this section and
  `agentApprovalGates.ts` together.

**Done means**

- Vault note at the correct path; no duplicate canon (link, don't restate).
- Decision notes for anything the operator had to choose.
- Repo `docs/` updated when process changes (link from vault to repo source of truth).

**Product status:** Agents tab row is **mock** — not derived from live queue.

---

## 5. Multi-pass workflow

Non-trivial slices follow six passes. Chief may require an approval card before
the next pass when a gate applies.

| Pass | Typical owner | Output | Chief gate? |
|------|---------------|--------|-------------|
| **Plan** | Architecture / Planner | Bounded spec, acceptance criteria | If roadmap/phase gate |
| **Gather** | Scout / Research | Evidence, facts vs inference | Rare |
| **Draft** | Build / Content / Research | Code, copy, or memo | If build/content/research gate |
| **Critique** | Review lane (`truecrew-review`) | Findings list, no silent fixes | No |
| **Approve** | **Operator on Chief → Approvals** | Recorded decision only | Always for gated work |
| **Log** | Build / Librarian | PR merged, `obsidian:log`, hot context | No |

**Approve is not Execute.** After Approve, the responsible agent still performs
merge, deploy, publish, or vault write as a separate tracked step.

---

## 6. Known limitations

Treat as constraints when testing or extending agents — not bugs to "fix" without
an explicit product decision.

1. **Decision-only** — Approve/Reject/Send back records decision; no automatic
   downstream action.
2. **Stable-ID re-propose** — prior decision overlay wins; refresh clears mock
   mode decisions; live API hydrates decisions on reload.
3. **Duplicate guard is pending-only** — second trigger blocked while pending; after
   decision, enqueue may succeed but card shows decided.
4. **Session-scoped proposal bodies** — no historical archive of card content in DB.
5. **Research gate label vs QA intent** — gate title may say "stack adoption"; QA
   copy must say test-only.
6. **Agents awaiting mirror** — only mapped proposals; **View in Agents** scrolls
   to lane, not individual card IDs.
7. **Focus highlight** — deep link highlight on Approvals cards clears after ~2s.

Detail: [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md) § Known limitations.

---

## 7. Operating playbook — copy-paste prompts

Safe for human-in-the-loop: agents propose; operator decides on Chief.

### 7.1 Starting a Chief-led session

```
You are working on True Crew's agent ecosystem. Read first:
1. docs/AGENT_CONSTITUTION.md (this constitution)
2. docs/AGENT_APPROVAL_LOOPS.md (if touching Chief/approvals)
3. docs/AGENT_WORKFLOW.md (PR + approver process)
4. CLAUDE.md (product tone)

Session start:
- Scan Chief → Situation Brief: pending approvals (note overdue/due-soon sublabel).
- Scan Chief → Agents → Awaiting approval for Build/Research live rows.
- Do not ask the operator to approve anything in chat — if a gate applies,
  describe what card you will enqueue (or have enqueued) on Chief → Approvals.

Remind yourself: approval records decision only; it does not execute your work.
```

### 7.2 Running a Build Agent slice

```
Lane: Build (Cursor / truecrew-build skill).
Read: docs/AGENT_CONSTITUTION.md §4.2, docs/AGENT_WORKFLOW.md,
.claude/skills/truecrew-build/SKILL.md.

Task: <one-sentence goal>

Before coding:
- Is this gated by APPROVAL_GATES.build (merge to main, migration,
  production refactor)? If yes → plan the ApprovalRequest/card; do not
  ask for approval in chat.
- If not gated → implement on a branch; open PR per PR_SUMMARY_TEMPLATE.md.

After implementation:
- npm run qa
- PR summary cites AGENT_APPROVAL_LOOPS.md if you touched chief/approval code.
- Ops to run section for anything the approver must not run manually.
- Never state that Chief approval merges or ships code.
```

### 7.3 Running a Research Agent slice

```
Lane: Research (truecrew-research skill) or Build lane for QA verification.
Read: docs/AGENT_CONSTITUTION.md §4.3, docs/AGENT_APPROVAL_LOOPS.md.

Task: <research question or QA verification>

For investigation memos:
- Separate facts from inference.
- Recommendations are options for the operator, not decisions made.
- Vendor/stack adoption → must become a Chief card, not a chat ask.

For Research QA loop verification:
- Monitor → Research Agent approval test → Propose test investigation.
- Confirm card in Chief → Approvals AND Agents → Awaiting approval (Research,
  live badge).
- Confirm QA-only wording in summary, checklist, and panel intro.
- Review in Approvals / View in Agents navigation works.
- Approve records decision only — no doc file created, no agent job run.
- Report pass/fail per AGENT_APPROVAL_LOOPS.md Research table.
```

### 7.4 Running a Filing / Second Brain session

```
Lane: Filing / Second Brain (Claude Code — cloud or local, see below).
Read: docs/AGENT_LANES_INTERNAL.md § Filing / Second Brain,
docs/OBSIDIAN_RESEARCH_INTAKE.md.

Task: file one completed Research Finding Intake payload.

Before filing:
- State plainly whether this is a cloud or local session — determines whether
  live Obsidian vault destinations are even reachable (cloud cannot reach the
  live vault; only knowledge/ is reachable from a cloud session).
- Read the intake payload as given; do not invent or infer a missing field
  (Tier, Destination) — send it back for completion instead.
- Run the dedupe check (OBSIDIAN_RESEARCH_INTAKE.md § Dedupe) before writing
  Lesson or Starter-Pass-candidate tier — not needed for Log tier.

Write only to the tier's mapped destination:
- Log -> append knowledge/log.md
- Lesson -> create knowledge/lessons/<slug>.md
- Starter-Pass-candidate -> create knowledge/inbox/<slug>.md (a flag, not a
  durable page — never knowledge/concepts/, projects/, decisions/, or sources/)

Filing needs no ApprovalCard — this is routine internal knowledge maintenance,
not a Chief gate. Stop rule: never create a concepts/projects/decisions/sources
page yourself (Second Brain Starter Pass only); never write the live Obsidian
vault from a cloud session; never make an approval decision.
```

### 7.5 Handing off decisions and logging

```
Operator handoff (you do not decide for the operator):
- Point to Chief → Approvals (or Review in Approvals from Agents).
- Card must show: title, summary, checklist, risk, urgency if aged.
- Operator chooses: Approve / Send back / Reject.
- After decision: card leaves pending views; decision may persist (live API).

Agent follow-up after operator Approve (separate steps — not automatic):
- Merge PR / publish copy / run migration — only if that was the scoped work
  and the operator has approved the PR or action through normal process.
- Log to Obsidian:
  npm run obsidian:log -- decision --title "<title>" --decision "<outcome>" --context "<why>"
  npm run obsidian:log -- pr --number <n> --title "<title>" --status merged --url "<url>"
- Update True Crew/Hot Context.md if focus changed.

Never claim approval executed anything. Say what the operator decided and what
remains for the agent to do.
```

### 7.6 Micro-checklists

**Before proposing an approval card**

- [ ] Action is listed in `APPROVAL_GATES` for this agent (or is QA test per loops doc).
- [ ] Using `createApprovalCardFrom*Request()` + `addCommandApproval()` — not chat.
- [ ] Summary disambiguates seeded vs runtime cards (reference QA doc if test).
- [ ] QA tests say QA-only in summary, checklist, and panel intro.
- [ ] Stable ID + pending duplicate guard considered.

**After operator decision**

- [ ] Do not auto-merge, auto-publish, or auto-run migrations on Approve.
- [ ] If Send back: revise proposal or work; re-enqueue only with stable-ID rules understood.
- [ ] Log decision to vault when it changes roadmap, process, or canonical knowledge.
- [ ] Update PR / hot context as appropriate.

**Approval-loop QA smoke (Build + Research)**

- [ ] Trigger from Builds / Monitor test panel.
- [ ] Card appears: Chief → Approvals (pending) + Agents → Awaiting (live).
- [ ] Review in Approvals highlights correct card.
- [ ] View in Agents returns to awaiting lane.
- [ ] Decision removes card from pending; no file execution side effect.
- [ ] Re-trigger behavior matches stable-ID limitations doc.

---

## 8. Rules for future tools and agents

1. **Read this constitution** before proposing new agent behavior or Chief changes.
2. **Read AGENT_APPROVAL_LOOPS.md** before editing `src/components/chief/` approval code.
3. **Never bypass Chief** — no new approval surfaces, tables, or chat asks.
4. **Never imply auto-execute** in card copy, PR text, or prompts.
5. **Extend gates in code first** — add to `APPROVAL_GATES`, typed request, factory,
   then document here and in AGENT_APPROVAL_LOOPS if runtime-triggered.
6. **Cite docs in PRs** — e.g. "Per docs/AGENT_CONSTITUTION.md §4.2 …"
7. **Planner / Content / Librarian runtime triggers** — when built, add a loop
   table to AGENT_APPROVAL_LOOPS.md and update §4.4–4.6 status here; do not
   document behavior before it exists in product.
8. **Check and log at runtime** — for runtime invariants, the session pre-check
   prompt, and decision-logging guidance, see
   [AGENT_RUNTIME_GOVERNANCE.md](AGENT_RUNTIME_GOVERNANCE.md).

---

## 9. Document map

| Document | Holds |
|----------|--------|
| **AGENT_CONSTITUTION.md** (this file) | Laws, Chief foreman role, agent roster, multi-pass workflow, prompts |
| [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) | Agent vs approver PR process, checklists, vault bootstrap |
| [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md) | Build/Research loop tables, urgency signals, limitations, code map |
| [EXECUTION_KIT.md](EXECUTION_KIT.md) | Lane routing (Scout/Build/Architecture), kickoff prompts |
| [OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md) | Vault paths, `obsidian:log` CLI |
| [PR_SUMMARY_TEMPLATE.md](PR_SUMMARY_TEMPLATE.md) | PR description template |
| [AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) | Chief Intake Rule (Priority/Task discipline), Second Brain vault (`knowledge/`), Lessons, Memory Review Pass — not covered elsewhere in this doc set |
| [AGENT_LANES_INTERNAL.md](AGENT_LANES_INTERNAL.md) | Chief / Research / Filing lane definitions for `knowledge/` work specifically |
| [RESEARCH_SECOND_BRAIN_WORKFLOW.md](RESEARCH_SECOND_BRAIN_WORKFLOW.md) | Research's filing tiers (Log/Lesson/Starter-Pass-candidate) |
| [OBSIDIAN_RESEARCH_INTAKE.md](OBSIDIAN_RESEARCH_INTAKE.md) | Fixed intake template Research hands to the Filing lane |
| `.claude/skills/truecrew-*` | Phase behavior: build, review, research, ship |
| `.claude/project-rules.md` | Scoping, tone, workflow pointer |
| `src/components/chief/agentApprovalGates.ts` | `APPROVAL_GATES`, request types, factories (code truth for gates) |

**Conflict resolution:** code + AGENT_APPROVAL_LOOPS.md win on technical approval
behavior; this constitution wins on roles, laws, and operating discipline; AGENT_WORKFLOW.md
wins on PR/approver mechanics; AGENT_RUNBOOK.md wins on Chief's Priority/Task intake
and on everything under `knowledge/` (Second Brain, Lessons, Memory Review Pass,
Research filing) — this constitution's roster and approval laws still apply on top
of it, the two are not in tension, just scoped to different parts of the system.
