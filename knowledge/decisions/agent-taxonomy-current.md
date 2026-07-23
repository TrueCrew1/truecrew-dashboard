---
title: Agent taxonomy — five promptable lanes are current
type: decision
status: approved
confidence: high
last_reviewed: 2026-07-23
created: 2026-07-23
updated: 2026-07-23
related_pages: []
related_prs: []
related_cards: []
---

# Agent taxonomy — five promptable lanes are current

**Status: approved**

**Current (authoritative):** Chief · Research · Librarian · Repo · Knowledge  
**Historical (runbook specialist list):** Planner · Build · Research · Content (+ reserved Reliability)

---

## What was decided

The **promptable agent taxonomy** for True Crew is five lanes:

| Lane | Role |
|------|------|
| **Chief** | Only operator-facing voice; approvals router; tool-enabled surface |
| **Research** | Grounded findings from real signals |
| **Librarian** | Task-linked Obsidian / artifact filing |
| **Repo** | Code/docs/config changes in this repo via PR (runbook name was “Build”) |
| **Knowledge** | Git-tracked second brain under `knowledge/` |

The older runbook framing — **Planner / Build / Research / Content** as peer
“agents,” with **Reliability** reserved — stays in `docs/AGENT_RUNBOOK.md` as
**historical gates and workflow detail**. It is **not** the live prompt taxonomy.

Name mapping when reading old sections: **Build → Repo**. Planner, Content, and
Reliability are not promptable lanes unless a later decision adds them.

## Why

The vault and runbook drifted: live product/prompt work uses Chief + Research +
Librarian + Repo + Knowledge, while the runbook Overview still opens with the
older four-specialist list. Readers need one place that says which list is
current without rewriting historical sections into a false present tense.

## Alternatives considered

- **Rewrite the whole runbook to the new names** — deferred; large, easy to
  invent “current” language over old gates. Prefer a decision note + banner.
- **Keep both lists as equally live** — rejected; causes agent/prompt confusion.
- **Treat UI board labels (Roadmap, Workflow Gate, Marketer) as lanes** —
  rejected; those are board rows, not promptable lanes.

## Where to look

| Need | Source |
|------|--------|
| **Current taxonomy (this note)** | You are here |
| Live gates / workflows (historical specialist names OK) | [docs/AGENT_RUNBOOK.md](../../docs/AGENT_RUNBOOK.md) |
| UI Agents board rows (not the prompt taxonomy) | [docs/AGENTS_BOARD.md](../../docs/AGENTS_BOARD.md) |

## Related PRs / cards

- PRs: none required for this docs-only resolution
- ApprovalCards: none
