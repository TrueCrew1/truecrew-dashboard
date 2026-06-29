---
type: reference
source: true-crew
---

# Agent ↔ Approver workflow

Quick reference for the True Crew vault. Canonical repo doc: `docs/AGENT_WORKFLOW.md`.

## Your job (approver)

- Approve or reject **PRs**
- Approve or edit **summaries** and **decision notes**
- Approve or reject **ops checklists** (`10_INTEGRATIONS/GitHub-Workflow.md`)

You do **not** run commands or create folders manually.

## Agent job

- Implement changes in the repo
- Put required commands in **Ops to run** (this vault or repo scripts)
- Open PRs with what / why / risk
- Update Obsidian via `npm run obsidian:log`

## Key vault paths

| Path | Purpose |
|------|---------|
| `10_INTEGRATIONS/GitHub-Workflow.md` | Pending ops commands |
| `Decisions/` | One note per decision |
| `Operations/Logs/PR Log.md` | Rolling PR history |
| `True Crew/Hot Context.md` | Current focus (living note) |

## Hot context

See [[Hot Context]] for current agent focus and blockers.
