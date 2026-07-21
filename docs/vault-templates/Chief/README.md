---
type: onboarding
title: Chief folder — vault setup
summary: How to seed this repo's Chief templates into the live Obsidian vault, and how they relate to repo-side research/knowledge folders.
source: true-crew
---

# Chief folder

Copy every file in this folder into a `Chief/` folder inside the live Obsidian vault
(`OBSIDIAN_VAULT_PATH` in your local env file — see `docs/vault-templates/True
Crew/Agent Workflow.md` for the vault-path reference). This folder mirrors a small
set of operator-facing notes into Obsidian; it does not replace the repo's own
`knowledge/` second brain (see `knowledge/README.md`) — the two are deliberately kept
separate (see `knowledge/projects/second-brain-setup.md` § Open items).

## Files

| File | Purpose |
|---|---|
| `Priorities.md` | The standing priority slices — Goal / Current blocker / Next single slice per slice. Update blocker/next-slice only when they actually change. |
| `Agent Roles.md` | Roster of the Chief-system agents (Chief, Planner, Build, Research, Content, Reliability) and their current focus. |
| `Research Queue.md` | Topics queued for research, one entry per topic, until picked up and filed. |
| `README.md` | This file. |

## How research flows through this system

1. **Raw output** — a research pass (see `docs/RESEARCH_TOOL_SETUP.md` for which
   tools are manual-only vs. agent-usable) lands as a raw markdown file in the repo's
   `drafts/` folder (repo root — local scratch space, not part of `knowledge/`).
2. **Canonical filing** — once reviewed, durable findings get filed into the repo's
   `knowledge/` second brain: `knowledge/sources/` first (the raw artifact, preserved
   as-is), then `knowledge/concepts/`, `knowledge/projects/`, or `knowledge/decisions/`
   for distilled, reusable guidance. See `knowledge/README.md` for the full model.
3. **Obsidian mirror** — this `Chief/` folder holds the small set of notes David reads
   and edits by hand in Obsidian — priorities, roles, and the research queue — not the
   full knowledge base.

## Setup (one-time, human step)

1. Create a `Chief/` folder inside the Obsidian vault.
2. Copy `Priorities.md`, `Agent Roles.md`, `Research Queue.md`, and this `README.md`
   into it.
3. If using API-based research tools, copy `docs/research-tools.env.example` to a
   local, gitignored env file and paste real keys there only — never into this repo.
