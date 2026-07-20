# True Crew Knowledge Base

This is True Crew's "second brain" — a plain-markdown, git-tracked operating memory
living inside the dashboard repo, next to the code it's about. It's designed to
survive session resets, be readable by humans and agents alike, and directly shape
how future agent work gets done — not just describe what happened.

## Who this is for

**Agent-maintained first, human-readable always.** David does not keep a manual
note-taking habit, and this system is built around that fact rather than against it.
Planner, Build, Research, and Content — coordinated by Chief — turn work that already
happens (PRs, the Build Log, Agent Runbook sections, ApprovalCard decisions, audits,
status checks) into durable memory here. David's job is to read this when he wants
context, and occasionally to make a call on a `decisions/` page — not to write it.

If a habit never forms, the vault still grows, because it's fed by work artifacts that
already exist, not by a diary someone has to keep.

## Start here: `MEMORY.md`, not this file

**[MEMORY.md](MEMORY.md) is the one file every agent checks first**, before opening
anything else — a short, curated index of what's currently most important (active
priorities, core concepts, current projects, open decisions, high-value lessons,
stable references), one line each. `index.md` is the *complete* map of every page;
`MEMORY.md` is the small, fast first stop. Agents should never load the whole vault by
default — check `MEMORY.md`, then open only the specific pages the current task
actually needs.

## The five memory layers

Everything in `knowledge/` belongs to one of five layers, by purpose, not just by
folder name:

| Layer | Folder(s) | Purpose |
|---|---|---|
| **Memory index** | `MEMORY.md` | Always checked first. Small, curated, one-line pointers to what matters right now. |
| **Event logs** | Build Log (Obsidian), `log.md` | Chronological record of what happened — broad, cheap, append-only. |
| **Raw capture** | `inbox/`, `sources/`, `discovery/` | Source material, intermediate notes, and early SaaS discovery capture (interviews, findings, workflows, competitors, assumptions, questions). |
| **Durable knowledge** | `concepts/`, `projects/`, `decisions/` | Reusable guidance — curated, distilled, meant to be read again. |
| **Lessons** | `lessons/` | Small, specific, behavior-changing rules — see below. |
| **Reference** | `reference/` | Stable lookup facts (tool access, workflow entry points) — rarely change. |

**Logs record events; vault pages encode reusable judgment.** A Build Log entry or a
`log.md` line says what happened. A `concepts/`, `decisions/`, or `lessons/` page says
what to *do* about it, going forward. Don't copy raw logs into those pages unless the
raw detail is genuinely necessary — link to the log entry instead.

## Lessons: memory that changes behavior

`lessons/` holds compact, specific rules that should directly shape what a future
agent does — not full concept pages, not activity logs. Each lesson is its own file:
a plain-language **rule**, **why** it matters, and when to **apply**, **avoid**, and
**check first**. If an insight is genuinely behavior-changing, it earns a lesson; if
it's merely descriptive, it belongs in a `concepts/` page (or nowhere). Concept pages
can link to lessons; lessons link back to the concepts/decisions they came from.

## No note is created from imagination

Every page here traces back to something real: a PR number, a Build Log entry, a
runbook section, a verified status check. Uncertainty is written down as uncertainty,
not smoothed over. Small and plain — no database, no special app, no required plugin.
Any markdown editor (or GitHub's own file viewer) is enough to read or edit anything
here.

## How to use this, day to day

- Start at [MEMORY.md](MEMORY.md); browse the full map from [index.md](index.md).
- To add to it yourself: copy a template from `templates/`, fill it in, and append a
  line to `log.md`. Nothing here requires that of you, though — see the Agent
  Runbook's **Second Brain Starter Pass** workflow (`docs/AGENT_RUNBOOK.md`) for how
  Chief keeps this going without you.
- To ask an agent to update it: "Ask Chief for a Second Brain Starter Pass" or "Ask
  Chief to ingest this week's dashboard work into the knowledge base."

## Folder layout

| Folder | What lives here |
|---|---|
| `inbox/` | Temporary raw captures waiting to be processed. Should stay small and empty most of the time. |
| `discovery/` | Early-stage SaaS discovery capture — interviews, findings, workflow observations, competitors, assumptions, questions. Use templates + `reference/knowledge-schema.md`. |
| `sources/` | One note per raw artifact (a PR, a Build Log entry, a runbook section, a status-check result). Preserves the original facts and any uncertainty, before synthesis. |
| `concepts/` | Durable topic pages — the load-bearing ideas of this project. High-value ones are structured as compact playbooks (Summary / What works / What to check first / Open questions / Related). |
| `projects/` | Pages for active efforts (e.g. the dashboard itself, a specific audit). |
| `decisions/` | One page per meaningful decision — what was decided, why, alternatives, and current outcome status (approved / pending / declined). |
| `lessons/` | Compact, behavior-changing rules — one file per lesson, tagged by category (success/failure/constraint/recovery/research/orchestration pattern). |
| `reference/` | Stable lookup pages for recurring operational facts (tool access, workflow entry points, knowledge schema, regulated content). |
| `templates/` | Copy one of these to start a new page in the right shape. |

**Discovery + regulated content:** see [discovery/README.md](discovery/README.md),
[reference/knowledge-schema.md](reference/knowledge-schema.md), and
[reference/regulated-content.md](reference/regulated-content.md).

See `docs/AGENT_RUNBOOK.md` § **Memory Architecture** for the full layer model and
retrieval order, § **Lessons** for what turns an event into durable, behavior-changing
memory, § **Second Brain Starter Pass** for the workflow that keeps this vault
current, § **Memory Review Pass** for periodic review/deprecation, and § **Knowledge
Maintenance** for the operating rules agents follow when writing here.
