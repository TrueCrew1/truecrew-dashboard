# Obsidian research intake

> [LEGACY-FROZEN] This document describes the legacy knowledge/-rooted
> research intake flow. It remains authoritative per
> docs/OPERATIONS/AGENT_LANE_RECONCILIATION_PLAN.md, which tracks its
> relationship to the newer docs/SECOND_BRAIN shelf as unresolved.

Docs-only spec. Defines the practical hand-off from a Research finding (per
[docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md](RESEARCH_SECOND_BRAIN_WORKFLOW.md)) to an
actual filed note — in `knowledge/` (this repo's git-tracked second brain) and/or the
live Obsidian vault (per [docs/OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md)). This doc adds
no new write permission, no new gate, and no automation. It fixes the *shape* of the
hand-off so filing is consistent regardless of who does it or when.

Read first: [docs/AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) (§ Research Agent, § Memory
Architecture, § Lessons, § Knowledge Maintenance), [docs/AGENT_WORKFLOW.md](AGENT_WORKFLOW.md),
[docs/OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md), and
[docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md](RESEARCH_SECOND_BRAIN_WORKFLOW.md) — this doc
doesn't restate their rules, it wires them together at the filing step.

## Two destinations, not one

`knowledge/` and "the Obsidian vault" are not the same thing, and this doc is careful
not to blur them:

| | `knowledge/` (this repo) | Live Obsidian vault |
|---|---|---|
| Where | Git-tracked, inside `truecrew-dashboard` | Local to David's machine, path set in `OBSIDIAN_VAULT_PATH` |
| Reachable by | Any Claude Code session with repo access (cloud or local) | Only a **local** Claude Code session — a cloud session cannot reach it (per `docs/OBSIDIAN_LOGGING.md`: "Vercel cannot reach a local vault") |
| Written via | Normal file edit + PR, same as any repo change | `npm run obsidian:log` CLI, or a direct edit, run locally |
| Holds | `log.md`, `inbox/`, `sources/`, `concepts/`, `projects/`, `decisions/`, `lessons/`, `reference/` | Build Log, PR Log, Decisions, Hot Context (see `docs/OBSIDIAN_LOGGING.md`'s vault note-path table) |

The intake template below is destination-agnostic on purpose — the filing clerk picks
the real destination from the finding's **Tier** (see below) and from which kind of
session is doing the filing.

## Purpose

Give Research (and whoever files on Research's behalf) one fixed note shape to hand
off a finding, so the filing clerk never has to guess a field, invent a heading, or
re-interpret prose to figure out where something goes.

## Who produces, who files, who approves

- **Produces the payload:** the Research agent, during any task where a finding clears
  the "what deserves filing" bar in `RESEARCH_SECOND_BRAIN_WORKFLOW.md`. Research fills
  in the intake template below — nothing more.
- **Files it:** **Claude Code**, acting as the filing clerk. Concretely, this is
  whichever Claude Code session actually has write access to the real destination:
  - **`knowledge/` destinations** (`log.md`, `inbox/`, `lessons/`) — any Claude Code
    session with repo access, cloud or local, via a normal commit/PR. This may be the
    same session that produced the finding, or a separate one handed the intake block.
  - **Live Obsidian vault destinations** (Build Log, PR Log, Decisions) — only a
    **local** Claude Code session, run on David's machine with `OBSIDIAN_VAULT_PATH`
    set, using the existing `npm run obsidian:log` commands from
    `docs/OBSIDIAN_LOGGING.md`. A cloud session must never claim to have written to the
    live vault — it can't reach it.
- **Approves:** filing itself needs **no `ApprovalCard`** — it's internal knowledge
  maintenance, same "none" gate as the Second Brain Starter Pass and Weekly Research
  Scan's own logging step. A card is only ever needed for what the *finding itself*
  recommends (tool/vendor adoption, a stack change) — see Relation to Chief approval
  packets below. Filing and approval are independent tracks.

## Canonical hand-off format

Every finding worth filing gets written up **once**, before any filing decision is
made, in the fixed-field block below. This is the same "Research Finding" note from
`RESEARCH_SECOND_BRAIN_WORKFLOW.md`, extended with the fields a filing clerk actually
needs (a stable ID, an explicit tier, a dedupe note, and a destination) — the base
fields are unchanged, nothing here contradicts that doc.

One block per finding. Multiple findings from the same task are multiple blocks, not
one block with multiple findings crammed into one field — a filing clerk should never
have to split a field apart.

## Fixed-field template: Research Finding Intake

```
### Research Finding Intake — {{short title}}
- ID: {{YYYY-MM-DD-short-slug-NN}}
- Date: {{YYYY-MM-DD}}
- Agent: Research
- Source(s) checked: {{what was actually read — cite it, not memory}}
- Finding: {{one or two sentences — the conclusion, not the topic}}
- Worked: {{what held up and is worth reusing, or "none"}}
- Failed: {{what didn't and is worth avoiding, or "none"}}
- Next time: {{one concrete change for next time, or "none"}}
- Tier: {{Log | Lesson | Starter-Pass-candidate}}
- Dedupe check: {{what was searched before filing — MEMORY.md, index.md, log.md, lessons/, inbox/ — and what it found, or "n/a for Log tier"}}
- Destination: {{knowledge/log.md | knowledge/lessons/<slug>.md | knowledge/inbox/<slug>.md | Obsidian Build Log | Obsidian PR Log | "none — Log tier only"}}
- Related approval request: {{gate/card name, or "none"}}
- Related PR: {{# or "none"}}
```

`NN` is a two-digit sequence (starting `01`), incremented only when the same
`YYYY-MM-DD-short-slug` already exists — checked as part of Dedupe check below, same
step, no separate lookup. This keeps same-day findings with the same title (multiple
blocks from one task, per Canonical hand-off format above) collision-free without
requiring wall-clock precision.

### Required vs optional fields

| Field | Required | Notes |
|---|---|---|
| ID, Date, Agent | Always | ID is the stable key filing and any later reference (a card, a PR) can point back to — the `NN` suffix makes it collision-resistant across same-day, same-slug findings. |
| Source(s) checked, Finding | Always | No filing without a real, checked source — same rule as the underlying Research Agent loop. |
| Worked / Failed / Next time | Always present, value may be "none" | Per `RESEARCH_SECOND_BRAIN_WORKFLOW.md` — any clause can be "none," that's a complete answer, not a gap. |
| Tier | Always | Drives everything below. Defaults to `Log` — Research doesn't self-select `Lesson`/`Starter-Pass-candidate` without clearing that tier's real bar. |
| Dedupe check | Required for `Lesson` and `Starter-Pass-candidate`; not needed for `Log` | Log lines are append-only history — duplicates there are just more history, not a problem. |
| Destination | Always | Filing clerk fills this in if Research left it blank; never files without a named destination. |
| Related approval request | Optional | "none" is the common case — most findings never hit a gate. |
| Related PR | Optional | Only when the finding came out of, or feeds into, a real PR. |

## How Tier drives destination

Same three tiers as `RESEARCH_SECOND_BRAIN_WORKFLOW.md` — this section is the
mechanical "what file, literally" mapping, nothing new:

| Tier | Destination | Who files | Note-update rule |
|---|---|---|---|
| **Log** | `knowledge/log.md` line, always. Also the live Obsidian vault via `npm run obsidian:log -- research-finding ...` **when a local session is filing** — writes one dedicated note per finding to `Research/{{date}} — {{title}}.md`, in the fixed-field shape below (see `lib/obsidian/log.ts`'s `logResearchFinding`). This is manual, one finding at a time, same as every other `obsidian:log` command — no automated or scheduled filing. | Any Claude Code session (repo access for `log.md`; local-only for the live vault) | Always append to `log.md` — never edit a past log line. The `Research/` note is one file per finding, not appended. |
| **Lesson** | `knowledge/lessons/<slug>.md` | Any Claude Code session with repo access, via PR — this is Research's own existing narrow exception in `AGENT_RUNBOOK.md` § Lessons, not a new permission | Prefer updating an existing lesson on the same topic (bump `last_reviewed`) over creating a new file — see Dedupe below. New file only when genuinely distinct. |
| **Starter-Pass-candidate** | `knowledge/inbox/<slug>.md` — a raw capture staged for the next Starter Pass, **not** a `sources/`/`concepts/`/`decisions/` page itself; only the Starter Pass creates that durable page | Any Claude Code session with repo access | Check `inbox/` first (see Dedupe below): update the existing candidate file if one matches, otherwise create a new one. Never edit `sources/`/`concepts/`/`decisions/` directly at this tier. |

Research does not gain write access to `knowledge/concepts/`, `knowledge/projects/`,
`knowledge/decisions/`, or `knowledge/sources/` through this doc — those still require
the Second Brain Starter Pass, unchanged from `AGENT_RUNBOOK.md`.

## Worked / failed / next time

Carried verbatim from the intake block into the destination, in every tier:

- **Log tier:** folded into the log line's reason/source clause, or the
  `obsidian:log -- build --notes` text for the live vault.
- **Lesson tier:** maps directly onto the lesson template's **Why** (Worked/Failed) and
  **Apply when**/**Avoid when** (Next time) sections — see
  `knowledge/templates/lesson-template.md`.
- **Starter-Pass-candidate tier:** kept as-is inside the `inbox/` raw capture, under a
  `## Worked / Failed / Next time` heading, so the Starter Pass doesn't have to
  reconstruct it from a PR or chat history later.

## Dedupe: update vs. new note

Before filing `Lesson` or `Starter-Pass-candidate` tier, the filing clerk checks:

1. `knowledge/MEMORY.md` and `knowledge/index.md` for an existing page on the same
   topic (per `AGENT_RUNBOOK.md`'s "prefer updating over duplicating").
2. `knowledge/log.md` for a recent deferred-candidate line on the same topic, so a
   pending idea isn't re-flagged as new.
3. For `Lesson` tier specifically: search `knowledge/lessons/` by filename and
   heading; if one already covers the topic, sharpen/extend it instead of adding a
   near-duplicate file (the vault's lessons cap makes this the default, not an
   exception).
4. For `Starter-Pass-candidate` tier specifically: search `knowledge/inbox/` by ID and
   topic before creating a file. If a matching candidate is already staged there,
   update that file (append the new source/finding under its own dated sub-heading)
   instead of creating a second one — refiling the same pending candidate must not
   produce duplicate inbox entries or duplicate Starter Pass work. Create a new file
   only when no match exists.

For the live Obsidian vault: Decisions are one note per decision
(`Decisions/{{YYYY-MM-DD}} — {{title}}.md`, per `docs/OBSIDIAN_LOGGING.md`) — an update
to an existing pending decision edits that note; a genuinely new decision gets a new
one. The Build Log and PR Log are rolling, append-only — no dedupe needed there, same
as `Log` tier above.

## Relation to Chief approval packets

Unchanged from `RESEARCH_SECOND_BRAIN_WORKFLOW.md`: filing and approval are
independent outcomes of the same finding.

- A finding that hits a Research gate still becomes a `ResearchApprovalRequest` →
  `ApprovalCard`, exactly as `AGENT_RUNBOOK.md` and `AGENT_APPROVAL_LOOPS.md` already
  define — this doc adds no new gate, field, or schema.
- When a finding produces both a card and a filed note, the card's `summary` names the
  intake block's **ID**, so anyone reading the card can find the underlying write-up
  without re-deriving it — same cross-reference discipline as the parent workflow doc,
  made concrete with a real field to point at.
- Filing never requires a card, and a card never requires filing. Most findings do one
  or the other; a few do both; most single-fact lookups do neither.

## Guardrails

- **No note spam.** `Log` is the default tier; `Lesson` and `Starter-Pass-candidate`
  are earned, not assumed. One intake block per finding, never a batch note covering
  several unrelated findings.
- **No direct Research write beyond current permission.** This doc grants nothing new.
  Research (and any Claude Code session filing on its behalf) may still only write
  `knowledge/log.md`, `knowledge/inbox/`, and `knowledge/lessons/*.md` directly — never
  `concepts/`, `projects/`, `decisions/`, or `sources/`, and never the live Obsidian
  vault from a cloud session.
- **No claims of automation that doesn't exist.** Filing is a manual act performed by
  a Claude Code session today — there is no CLI command, webhook, or scheduled job that
  files a Research Finding Intake block automatically. `docs/OBSIDIAN_LOGGING.md`'s own
  "Manual vs automated" table already states this for every other log type; this intake
  format doesn't change that.
- **Quality over quantity.** The same caps and tests from `RESEARCH_SECOND_BRAIN_WORKFLOW.md`
  and `AGENT_RUNBOOK.md` § Second Brain Starter Pass apply unchanged: `knowledge/lessons/`
  capped at 20 vault-wide, the 3–6 month test gates anything that would eventually become
  a durable page, and a task that produces zero `Lesson`/`Starter-Pass-candidate` blocks
  is a complete, successful task — not an unfinished one.

## Future work (not built here)

- **Built:** `npm run obsidian:log -- research-finding` (see How Tier drives
  destination → Log, above) takes the intake fields directly as CLI flags and writes
  one note to the live Obsidian vault. It is still manual, local-only, and one finding
  at a time — no queue, no scheduling, no unattended writes. `knowledge/` filing
  (`log.md`, `lessons/`, `inbox/`) is unaffected — still a Claude Code session reading
  the block and writing the file itself, same as any other repo edit.
- Any automatic parsing of an intake block into a `knowledge/` file — today, a Claude
  Code session reads the block and writes the file itself, same as any other repo
  edit.
- Any connector, webhook, or scheduled job that moves findings from Research into
  Obsidian without a Claude Code session in the loop. This remains true even with the
  CLI command above — a human still runs it, per finding.
- A Chief-facing UI surface for filing status or browsing filed research findings —
  still not proposed or implied; Chief's read boundary to `knowledge/` is unchanged
  (see Chief and the second brain, above).

## Copy-paste template

The block below is the literal, ready-to-use template — copy it, fill in the fields,
and hand it to a Claude Code session (cloud, for `knowledge/` destinations; local with
`OBSIDIAN_VAULT_PATH` set, for the live Obsidian vault) to file.

```markdown
### Research Finding Intake — {{short title}}
- ID: {{YYYY-MM-DD-short-slug-NN}}
- Date: {{YYYY-MM-DD}}
- Agent: Research
- Source(s) checked: {{...}}
- Finding: {{...}}
- Worked: {{... | none}}
- Failed: {{... | none}}
- Next time: {{... | none}}
- Tier: {{Log | Lesson | Starter-Pass-candidate}}
- Dedupe check: {{... | n/a for Log tier}}
- Destination: {{knowledge/log.md | knowledge/lessons/<slug>.md | knowledge/inbox/<slug>.md | Obsidian Build Log | Obsidian PR Log}}
- Related approval request: {{gate/card name | none}}
- Related PR: {{# | none}}
```
