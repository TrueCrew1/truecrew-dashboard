# Agent Runtime Governance

**Runtime guardrails, session pre-checks, decision logging, and future observability hooks for True Crew's agents and approvals.**

Describes the system **as it behaves today** — not a roadmap. This doc adds the *runtime*
layer on top of the existing governance docs; it does not change any approval semantics.
For laws and roles see [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md); for approval
mechanics see [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md); for PR/approver process
see [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md); for the vault CLI see
[OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md).

---

## 1. Purpose and scope

**What "runtime governance" means here.** It is two things, and nothing more:

1. **Check behavior at the moment an agent acts** — before running a tool or proposing a
   gated action, the agent verifies it is not about to break a constitutional invariant,
   and refuses or escalates if it would.
2. **Make runs reconstructable** — every gated decision is recorded so a past run can be
   inspected later (who decided what, why, and what followed) without the original
   session.

It is explicitly **not**:

- a new enforcement engine, middleware, or policy runtime,
- a new approval queue, table, or surface,
- anything that adds auto-execution — approval stays decision-only.

**This doc complements, it does not override.** Approvals remain human-in-the-loop and
decision-only, on the single Chief surface, exactly as defined in the constitution and
loops docs. The invariants below are behavioral MUST-rules upheld today by **the operator
and the policy-as-prompt pre-check (§3)**, made durable by **logging (§4)**, and made
observable later by **optional hooks (§5)**. They are **not enforced by code gates
today** — treat them as the contract every agent and operator is expected to keep.

**Audience:** operators/approvers, future tools and agents (Claude, Cursor, or others),
and contributors who need to know how to check and log actions at runtime.

---

## 2. Runtime invariants (MUST-hold rules)

Each rule is derived from a constitutional law or approval mechanic, phrased to be
checkable against a reconstructed run. "Gated actions" are the production-affecting or
high-impact operations enumerated in `APPROVAL_GATES`
(`src/components/chief/agentApprovalGates.ts`); routine actions outside that list remain
ungated.

**INV-1 — Chief is the only decision surface.** *(Laws 1, 4)*
Every approval decision (Approve / Send back / Reject) must originate from Chief →
Approvals on the shared queue. A chat "ok, approved," a DM, or any second surface is
**not** a decision and must be treated as none.
*Check:* the decision carries a Chief approval card id; no card id ⇒ no approval.

**INV-2 — Decision-only; no auto-execution.** *(Law 2)*
Recording a decision must not by itself run a tool, merge a PR, publish, migrate, advance
a workflow, or send a message. Any such action is a separate, explicitly taken step
*after* the decision.
*Check:* the production-affecting action is a distinct step that references the decision,
not one triggered by it.

**INV-3 — No gated action without a prior approved, logged decision.** *(Laws 2, 4; `APPROVAL_GATES`)*
No action listed in `APPROVAL_GATES` (merge to `main`, migration, production refactor,
new/re-sequenced phase, tool/vendor adoption, public copy or layout) may proceed until a
Chief card for it is Approved **and** that decision is logged (INV-6). Gated actions are
the production-affecting or high-impact operations enumerated in `APPROVAL_GATES`; routine
actions outside that list remain ungated.
*Check:* trace the action to an Approved card + a log entry; either missing ⇒ violation.

**INV-4 — One shared path for every proposal.** *(Law 3)*
Proposals enter only via `*ApprovalRequest → createApprovalCardFrom*Request() →
addCommandApproval()` into `ChiefApprovalsContext`. No new queues, tables, or bypass
surfaces for approvals.
*Check:* the card resolves to a sanctioned source/factory; no approval exists outside the
shared `approvals` array.

**INV-5 — Stable-ID decisions are honest.** *(Law 6)*
Agents must not silently reset or re-open a `stableChiefId` proposal to escape a prior
decision. A re-propose respects the existing decision overlay; changing an outcome
requires an explicit operator re-decision or a genuinely new proposal id.
*Check:* an already-decided stable ID presented as a "fresh" undecided card ⇒ violation.

**INV-6 — Every gated decision is recorded, reconstructably.** *(Law 2 + current logging behavior)*
Each decision on a gated action must be logged with **timestamp, actor, gate/action, card
id, decision, one-line rationale** — in `chief_approval_decisions` (live-API mode) and
optionally an `obsidian:log decision` entry. At minimum, every gated decision must exist
in `chief_approval_decisions`; `obsidian:log` entries are recommended for richer narrative
and linkage. Because proposal bodies are session-scoped, the durable record is the log +
linked PR/artifact, not the queue.
*Check:* who/what/why/when/outcome is recoverable from logs alone, without the original
session.

**INV-7 — QA-only proposals never count as real decisions.** *(Law 7)*
Build/Research runtime test cards stay labeled QA-only in summary, checklist, and panel
intro, and must never be recorded, summarized, or cited as a real merge, migration, or
vendor/stack decision.
*Check:* no log entry or status summary treats a QA-labeled card as a production decision.

---

## 3. Policy-as-prompt: session pre-check

Paste this block at the top of an agent session (Claude, Cursor, or any tool). It is a
**self-check + escalation** guide — it grants no authority, runs no tools, and never
bypasses Chief.

```
True Crew runtime pre-check — read before acting.

Before running any tool or proposing a gated action, verify all of the following.
If a planned action would break any rule, DO NOT run it. Instead, either propose a
Chief approval card for it, or escalate to the operator — and note why.

[ ] INV-1  This decision (if any) comes from Chief → Approvals, not chat/DM/other. No
           card id ⇒ not an approval.
[ ] INV-2  I am not treating "approved" as execution. Merging, publishing, migrating,
           deploying, or messaging is a SEPARATE step I take explicitly afterward.
[ ] INV-3  If this action is in APPROVAL_GATES (merge to main, migration, production
           refactor, new/re-sequenced phase, tool/vendor adoption, public copy/layout),
           there is an Approved Chief card AND a log entry for it. If not, I stop.
[ ] INV-4  Any proposal I create goes through the standard request → card factory →
           addCommandApproval path. I do not invent a new queue or surface.
[ ] INV-5  I am not re-opening or resetting an already-decided stable-ID card to dodge
           a prior decision. A new outcome needs an operator re-decision or a new id.
[ ] INV-6  Any gated decision I record includes: time, actor, gate/action, card id,
           decision, and a one-line rationale.
[ ] INV-7  Any QA test proposal is labeled QA-only and is never logged or reported as a
           real merge/migration/vendor decision.

If blocked by a gate:
  → "I can't run this directly — it's gated by APPROVAL_GATES. I'll prepare a Chief
     approval card and it needs an operator decision on Chief → Approvals first."

For sensitive decisions (anything gated, or anything with production/customer impact),
record a one-line rationale in the session notes or via obsidian:log (see §4).

I default to refuse-or-escalate when unsure. Approval records a decision only; it does
not authorize me to execute.
```

Keep it system-neutral: no tool names, no bypass paths, no auto-execution — only
self-check and escalation guidance.

---

## 4. Decision and action logging (`obsidian:log`)

Reconstructable logs come from two places that already exist:

- **`chief_approval_decisions`** (live-API mode) — the system of record for the decision
  itself (card id, status, decided-at, actor). See
  [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md).
- **`obsidian:log decision`** — the human-readable narrative + rationale + links, written
  to `Decisions/{YYYY-MM-DD} — {title}.md`. See [OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md).

### Minimal schema

Extend current practice with this field set (per gated decision):

| Field | Meaning |
|-------|---------|
| **date/time** | When the decision was recorded (ISO or vault date) |
| **actor** | Who decided — operator name/role (human), never an agent claiming to approve |
| **gate / action** | The `APPROVAL_GATES` entry or action name |
| **card id** | The Chief approval card id (if present) — the join key to `chief_approval_decisions` |
| **decision** | Approve / Send back / Reject |
| **rationale** | One line: why this outcome |
| **linked PR / artifact** | PR number/URL or artifact id — referenced, not embedded |

Today's `obsidian:log decision` command takes `--title`, `--decision`, and `--context`.
Until dedicated flags exist, fold the structured fields (actor, gate, card id, PR link)
into `--context` as a short `key: value` line. Treat the richer flag set as a future CLI
extension, not a current capability.

### Example — Build approval

```bash
npm run obsidian:log -- decision \
  --title "Approve merge: billing rate limiter to main" \
  --decision "Approve" \
  --context "actor: operator (David); gate: Code change merging to main; card: apr-build-90; rationale: QA green, scoped to one endpoint, rollback documented; pr: https://github.com/TrueCrew1/truecrew-dashboard/pull/90"
```

### Example — Research approval

```bash
npm run obsidian:log -- decision \
  --title "Send back: transactional email vendor adoption" \
  --decision "Send back" \
  --context "actor: operator (David); gate: New tool or stack adoption; card: apr-research-notif-vendor; rationale: only one vendor evaluated — need a second option and pricing before deciding; artifact: docs/research/notif-vendor-memo.md"
```

### Rules for useful-but-succinct logs

1. **One entry per significant decision** — not per minor comment or intermediate step.
2. **Focus on the decision and its rationale** — short sentences; skip narration of the
   whole session.
3. **No secrets, no raw prompts** — env vars point at the vault root; never paste keys,
   tokens, or full prompt transcripts.
4. **Link, don't embed** — reference PRs and artifacts by URL or id rather than pasting
   their contents.

---

## 5. Future runtime hooks (non-breaking)

Sketches for later Build slices — **observability only**, not designed or implemented
here. Each fires at an existing chokepoint and emits a structured event for future
listeners (dashboards, alerts, an audit sink). No hook approves, executes, or authorizes
anything.

**`approval_decision_recorded`** — emitted where `recordDecision()` persists a decision.

```
event: approval_decision_recorded
  cardId, gate, source, decision (approve|reject|sent_back),
  actor, decidedAt, rationaleStub (optional)
```

**`approval_proposal_created`** *(optional)* — emitted where `addCommandApproval()`
enqueues a card.

```
event: approval_proposal_created
  cardId, gate, source, createdAt, isQaTest (bool)
```

Constraints these hooks must honor:

- **Observability only.** Events are for listeners; they are not commands and trigger no
  work.
- **Never authorization.** No event may be interpreted as approval or used to
  auto-execute a tool. The decision still happens in Chief; execution is a separate,
  explicit step (INV-2).
- **Human-in-the-loop preserved.** A listener may notify, chart, or alert — it may not
  act on the operator's behalf.

---

## 6. How this doc relates to other governance docs

| Document | Owns |
|----------|------|
| [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) | Laws, roles, discipline, multi-pass workflow |
| [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md) | Technical approval behavior (triggers, stable IDs, queue, limitations) |
| [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) | PR + approver mechanics |
| **AGENT_RUNTIME_GOVERNANCE.md** (this file) | Runtime invariants, session pre-checks, logging, future hooks |

**Which doc to read for a given question:**

- **"What is allowed?"** → [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md)
- **"How do approvals work?"** → [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md)
- **"How are PRs run?"** → [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md)
- **"How do I check and log actions at runtime?"** → this doc

**Precedence:** on approval mechanics, code + `AGENT_APPROVAL_LOOPS.md` win; on laws and
roles, `AGENT_CONSTITUTION.md` wins; on PR/approver process, `AGENT_WORKFLOW.md` wins.
This doc adds runtime checks and logging on top of all three and never overrides them.
