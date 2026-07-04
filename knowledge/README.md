# True Crew Knowledge Base

This is True Crew's "second brain" — a plain-markdown knowledge base living inside the
dashboard repo, next to the code it's about.

## Who this is for

**Agent-maintained first, human-readable always.** David does not keep a manual
note-taking habit, and this system is built around that fact rather than against it.
Planner, Build, Research, and Content — coordinated by Chief — turn work that already
happens (PRs, the Build Log, Agent Runbook sections, ApprovalCard decisions, audits,
status checks) into durable notes here. David's job is to read this when he wants
context, and occasionally to make a call on a `decisions/` page — not to write it.

If a habit never forms, the vault still grows, because it's fed by work artifacts that
already exist, not by a diary someone has to keep.

## How it works

- **Raw artifacts in, structured knowledge out.** A PR, a Build Log entry, a runbook
  section, a status check — none of these are "notes" on their own. An agent reads one,
  writes a short `sources/` note capturing what it actually said, and — only if it's
  durable enough to matter later — folds it into a `concepts/`, `projects/`, or
  `decisions/` page.
- **No note is created from imagination.** Every page here traces back to something
  real: a PR number, a Build Log entry, a runbook section, a verified status check.
  Uncertainty is written down as uncertainty, not smoothed over.
- **Small and plain.** No database, no special app, no required plugin. Any markdown
  editor (or GitHub's own file viewer) is enough to read or edit anything here.

## How to use this, day to day

- Browse from [index.md](index.md) — it links out to every concept, project, and
  decision page, plus what's changed recently.
- To add to it yourself: copy a template from `templates/`, fill it in, and append a
  line to `log.md`. Nothing here requires that of you, though — see the Agent Runbook's
  **Second Brain Starter Pass** workflow (`docs/AGENT_RUNBOOK.md`) for how Chief keeps
  this going without you.
- To ask an agent to update it: "Ask Chief for a Second Brain Starter Pass" or "Ask
  Chief to ingest this week's dashboard work into the knowledge base."

## Folder layout

| Folder | What lives here |
|---|---|
| `inbox/` | Temporary raw captures waiting to be processed. Should stay small and empty most of the time — things pass through, they don't live here. |
| `sources/` | One note per raw artifact (a PR, a Build Log entry, a runbook section, a status-check result). Preserves the original facts and any uncertainty, before synthesis. |
| `concepts/` | Durable topic pages — the load-bearing ideas of this project (e.g. Approval Load, Chief Approvals). |
| `projects/` | Pages for active efforts (e.g. the dashboard itself, a specific audit). |
| `decisions/` | One page per meaningful decision — what was decided, why, alternatives, and current status (approved / pending / declined). |
| `patterns/` | Reusable judgment, not activity — six pages (winning, failure, constraint, recovery, approval/orchestration, research), each a merged log of dated learning entries with next-time guidance and memory-worth tracking. See `docs/AGENT_RUNBOOK.md` § **High-Value Learning Capture**. |
| `templates/` | Copy one of these to start a new page in the right shape. |

See `docs/AGENT_RUNBOOK.md` § **Second Brain Starter Pass** for the full workflow that
keeps this vault current, § **Knowledge maintenance** for the operating rules agents
follow when writing here, and § **High-Value Learning Capture** for what turns a
one-off event into durable, reusable memory.
