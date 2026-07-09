# Research → Second Brain workflow

Docs-only spec. Defines how the **Research** agent turns a finding into two things at
once: an approval-ready packet for **Chief**, and — only when it clears a real bar —
structured input for the **second brain** (`knowledge/`). This doc does not change any
approval gate, schema, or UI. It sits on top of [docs/AGENT_RUNBOOK.md](AGENT_RUNBOOK.md)
(§ Research Agent, § Memory Architecture, § Lessons, § Knowledge Maintenance) and
[docs/AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md) — read those first; this doc
doesn't restate their rules, it wires Research's output into them.

## Purpose

Make Research useful twice from the same pass, not two separate efforts:

1. **Immediate** — an approval-ready proposal for Chief when the finding hits a gate
   (adopt/drop a tool, a stack change affecting Build or production).
2. **Long-term** — a durable trace in the second brain when the finding is the kind of
   thing a future pass would otherwise re-discover from scratch.

Most findings only earn #1, or neither. Earning both is the exception, not the goal.

## What deserves filing

File a finding (as a log line, a lesson, or a Starter Pass candidate — see Filing tiers
below) when it is at least one of:

- a **source judged trustworthy or noisy** in a way that would change how the next
  research pass spends its time,
- a **comparison with a real recommendation**, not just a list of options,
- a **dead end** — a path investigated and rejected, so it isn't re-investigated later,
- a finding that **contradicts or updates** something already in `knowledge/`,
- a **constraint** discovered mid-research (a tool, access, or data limit that changed
  what was possible to check).

## What does NOT get filed

- Routine, single-fact lookups with one obvious answer (per the Research Agent loop's
  own "single-pass is allowed only for trivial lookups" rule) — these stay in the task
  output, not the vault.
- A finding that only restates something `knowledge/` already has, unchanged.
- Raw source dumps, full page pastes, or chat transcripts — see Constraints.
- Anything speculative not checked against a real source this pass (per Research's
  existing verification rule: claims are checked against docs, not memory).
- External-facing text of any kind — `knowledge/` is internal only; that goes through
  Content's normal external-copy path instead (per AGENT_RUNBOOK § Knowledge
  Maintenance).

## Filing tiers

Research does **not** gain new write access to `knowledge/` beyond what
AGENT_RUNBOOK already grants. Three tiers, in order of how often each is used:

| Tier | What | Who writes it | How often |
|---|---|---|---|
| **1 — Log** | One line in the Build Log / Agent Log (or `knowledge/log.md`) | Research, always allowed | Every finding worth remembering at all |
| **2 — Lesson** | One `knowledge/lessons/*.md` file, category `research-pattern` | Research, only inside its own workflow's Learning capture step (per AGENT_RUNBOOK § Lessons' "narrow exception") | Only when a finding clears the Lessons bar (success/failure/constraint/recovery/research pattern) |
| **3 — Starter Pass candidate** | A durable `sources/`, `concepts/`, `projects/`, or `decisions/` page | **Not Research** — flagged by Research, created only by the next **Second Brain Starter Pass** (Chief, coordinating Research + Content) | Rare — only findings that pass the 3–6 month test in AGENT_RUNBOOK § Second Brain Starter Pass |

Tier 3 is a flag, not a write. Research's job is to make the candidate easy for the
Starter Pass to find later (name it in the log line), not to create the page itself.

## Fixed note headings

Every finding worth Tier 1 or above gets written up once, in this shape, before it's
routed anywhere else. Fixed headings so the same note can feed a Build Log line, a
`ResearchApprovalRequest` summary, or a future filing tool without re-writing it three
ways.

```
### Research Finding — {{short title}}
- Date: {{YYYY-MM-DD}}
- Source(s) checked: {{what was actually read — cite it, per the existing "claims checked
  against docs, not memory" rule}}
- Finding: {{one or two sentences — the actual conclusion, not a summary of the topic}}
- Worked / Failed / Next time: {{see Learning log below}}
- Second-brain candidate: {{no | Tier 2 (lesson) | Tier 3 (flag for Starter Pass) — and why}}
- Related approval request: {{card/gate name, or "none"}}
```

This is a note shape, not a new file type — it lives inside the Build Log / Agent Log
entry (or the `ResearchApprovalRequest` summary) that Research already writes. It does
not require a new script or storage location.

## Learning log: worked / failed / next time

Every fixed-heading note's "Worked / Failed / Next time" line answers, in one clause
each:

- **Worked** — what held up (a source, a query, a comparison approach) worth reusing.
- **Failed** — what didn't (a dead end, a bad source, a wrong assumption) worth
  avoiding next time.
- **Next time** — the one concrete change to make on the next similar pass, or "none."

Any clause can be "none" — a clean pass with nothing to report is a valid, complete
answer, not a gap to fill in. This is the same question AGENT_RUNBOOK's Learning
capture and promotion step already asks after each workflow; this just makes it a
fixed line so it survives being read out of context later, and so a Tier 2 lesson
(when warranted) can be written directly from it instead of re-deriving it.

## Relation to Chief approval packets

Filing and approval are independent outcomes of the same finding — neither requires
the other:

- A finding that hits a Research gate (tool/vendor adoption or removal, a stack change
  affecting Build or production) becomes a `ResearchApprovalRequest` →
  `ApprovalCard`, exactly as defined in AGENT_RUNBOOK § Research Agent and
  AGENT_APPROVAL_LOOPS. This doc adds no new gate and no new request field.
- A finding can be filed (Tier 1 or 2) with **no** approval packet — most comparisons
  and dead ends never reach a gate.
- A finding can produce an approval packet with **no** vault filing beyond Tier 1 — a
  one-off recommendation that doesn't reveal a reusable pattern.
- When a finding does both, the `ResearchApprovalRequest.summary` names the same
  short title used in the fixed-heading note, so Chief (and anyone reading the card
  later) can find the underlying write-up without re-deriving it.

## Constraints

- **No note spam.** A finding earns Tier 1 by default logging discipline, not Tier 2
  or 3 by default — most passes end at Tier 1.
- **No giant AI dump.** The fixed-heading note is short by construction (one finding,
  a few lines). Raw source material stays in the source itself or a linked PR/doc —
  never pasted wholesale into a log line, lesson, or future vault page.
- **Quality over quantity.** Research's existing caps still apply: at most one
  `ApprovalCard` per Weekly Research Scan, `knowledge/lessons/` capped at 20 vault-wide
  (prefer sharpening an existing lesson over adding a new one), and the 3–6 month test
  gates every Tier 3 candidate before it becomes a page. A pass that ends "nothing here
  clears the bar" is a complete, successful pass — not an unfinished one.

## Future work (not built here)

This spec defines the note shape and filing tiers only. Not in scope for this pass,
and not implied by it:

- Automated filing into Obsidian (e.g. a `npm run obsidian:log -- research-finding`
  command that writes the fixed-heading note directly) — today, filing is manual,
  same as every other `obsidian:log` command per
  [docs/OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md)'s "Manual vs automated" table.
- Any Notion or other external vault-tool integration — Notion is classified
  `HUMAN-ONLY` in AGENT_RUNBOOK § Tool Catalog today; nothing here changes that.
- A dedicated UI surface for browsing filed research findings — no new dashboard page
  is proposed or implied.

Building any of the above is its own separately-scoped, separately-approved task, the
same way Reliability's activation is reserved in AGENT_RUNBOOK — this doc makes that
future step smaller by fixing the shape now, not by starting it.
