---
title: Agent taxonomy — current operating lanes
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

# Agent taxonomy — current operating lanes

**Status: approved**

**Current authoritative operating taxonomy:** Chief · Research · Librarian · Repo · Knowledge  
**Historical (runbook specialist list):** Planner · Build · Research · Content (+ reserved Reliability)

This list governs the system **as it exists now** (prompts, live docs, and operator
routing). It is **not** a claim that no agents will ever be added.

---

## What was decided

True Crew’s **current** promptable lanes are:

| Lane | Role |
|------|------|
| **Chief** | Only operator-facing voice; approvals router; tool-enabled surface |
| **Research** | Grounded findings from real signals |
| **Librarian** | Task-linked Obsidian / artifact filing |
| **Repo** | Code/docs/config changes in this repo via PR (runbook name was “Build”) |
| **Knowledge** | Git-tracked second brain under `knowledge/` |

The older runbook framing — **Planner / Build / Research / Content** as peer
“agents,” with **Reliability** reserved — stays in `docs/AGENT_RUNBOOK.md` as
**historical** gates and workflow detail. It is **not** the live operating
taxonomy.

Name mapping when reading old sections: **Build → Repo**. Planner, Content, and
Reliability are not current operating lanes unless added by a later decision.

## Revision rule

- Add or remove a lane only by **updating this decision** or issuing a
  **superseding decision note** — not by drift, aspirational lists, or one-off
  doc edits.
- Live runbooks and prompts follow the **current** decision. Historical sections
  may keep old names for gates; they do not redefine the operating taxonomy.
- Until a revision lands, do not invent new promptable agents in prompts or
  “current” docs.

## Why

The vault and runbook drifted: live work uses Chief + Research + Librarian +
Repo + Knowledge, while the runbook Overview still opens with the older
four-specialist list. Readers need one place that states what is current now,
keeps history intact, and leaves a controlled path for later growth.

## Alternatives considered

- **Rewrite the whole runbook to the new names** — deferred; large, easy to
  invent “current” language over old gates. Prefer a decision note + banner.
- **Keep both lists as equally live** — rejected; causes agent/prompt confusion.
- **Treat UI board labels (Roadmap, Workflow Gate, Marketer) as lanes** —
  rejected; those are board rows, not operating lanes.
- **Freeze this list as forever architecture** — rejected; growth is allowed via
  the revision rule above.

## Where to look

| Need | Source |
|------|--------|
| **Current operating taxonomy (this note)** | You are here |
| Live gates / workflows (historical specialist names OK) | [docs/AGENT_RUNBOOK.md](../../docs/AGENT_RUNBOOK.md) |
| UI Agents board rows (not the operating taxonomy) | [docs/AGENTS_BOARD.md](../../docs/AGENTS_BOARD.md) |

## Related PRs / cards

- PRs: none required for this docs-only resolution
- ApprovalCards: none
