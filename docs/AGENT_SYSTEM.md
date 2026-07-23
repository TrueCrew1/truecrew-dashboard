# Agent system — True Crew dashboard

**Status:** Canonical lane taxonomy and contracts (2026-07-23).  
**Chief voice:** [CHIEF_SINGLE_VOICE.md](./CHIEF_SINGLE_VOICE.md)  
**Specialist prompts:** [prompts/](./prompts/)  
**Ship gate:** [SHIP_CHECKLIST.md](./SHIP_CHECKLIST.md)

This document is the index for promptable agent lanes in `truecrew-dashboard`.
Older runbook sections that list Planner / Build / Content / Reliability as peer
“agents” remain useful for gates and history; they are **not** the prompt taxonomy.

---

## Overview

True Crew’s agent system has **five promptable lanes**:

| Lane | Job | Prompt / contract |
|------|-----|-------------------|
| **Chief** | Single operator voice; local-first tool-enabled surface; approvals router; status + next action | [CHIEF_SINGLE_VOICE.md](./CHIEF_SINGLE_VOICE.md), [agents/CHIEF_OPERATING_SYSTEM.md](./agents/CHIEF_OPERATING_SYSTEM.md) |
| **Research** | Findings from real signals; grounded notes; no invented sources | [prompts/RESEARCH.md](./prompts/RESEARCH.md) |
| **Librarian** | Task-linked Obsidian / artifact filing (`lib/librarian`, vault notes) | [prompts/LIBRARIAN.md](./prompts/LIBRARIAN.md) |
| **Repo** | Code changes in this repository via PR (formerly “Build” in the runbook) | [prompts/REPO.md](./prompts/REPO.md) |
| **Knowledge** | Git-tracked second brain under `knowledge/` | [prompts/KNOWLEDGE.md](./prompts/KNOWLEDGE.md) |

Chief is the only lane that addresses the operator for decisions. The other four
produce work products and proposals that Chief packages into the reply format and,
when needed, approval cards.

---

## Key contracts

1. **Chief reply format (singular):**  
   `Status` → `Recommendation` → `Next action` → `Approval request`  
   See [CHIEF_SINGLE_VOICE.md](./CHIEF_SINGLE_VOICE.md).
2. **Human-in-the-loop:** merges, migrations, production deploys, and external
   messages require Chief approval / human action — specialists do not self-approve.
3. **Do not fabricate values;** ask or verify (`CLAUDE.md`).
4. **Ship gate for Repo work:** `npm run verify` + [SHIP_CHECKLIST.md](./SHIP_CHECKLIST.md).
5. **Separation:** M&S Painting product code stays in `TrueCrew1/ms-painting`
   (Chief **project** context in this repo — not Global; see
   [CHIEF_CONTEXT_SWITCHING.md](./CHIEF_CONTEXT_SWITCHING.md) and
   [agents/CHIEF_OPERATING_SYSTEM.md](./agents/CHIEF_OPERATING_SYSTEM.md)).
6. **Chief tools:** GitHub and Obsidian are wired surfaces; project dropdown
   routes context; Chief is not advisory-only
   ([agents/CHIEF_OPERATING_SYSTEM.md](./agents/CHIEF_OPERATING_SYSTEM.md)).

---

## Lane responsibilities (short)

### Chief
Operator-facing voice and **local-first, tool-enabled** surface (GitHub, Obsidian,
repo, dashboard APIs — governed). Routes to specialists. Uses tools for evidence;
mutating/destructive work still needs approval. Honors project dropdown: all
projects listed; Global = non-project / cross-project only; M&S is a project.
Never claims a capability that is not in the repo. Never treats chat assent as an
approval card decision. See [agents/CHIEF_OPERATING_SYSTEM.md](./agents/CHIEF_OPERATING_SYSTEM.md).

### Research
Investigate using real inputs (repo, Monitor signals, approved sources). Separate
facts from inference. File lasting notes via Knowledge or Librarian as appropriate;
do not invent citations.

### Librarian
Create and refine **task-linked artifacts** and Obsidian notes through the existing
Librarian paths (`lib/librarian/*`, `/api/librarian/artifacts`). Do not confuse this
with the git-tracked `knowledge/` tree (that is Knowledge).

### Repo
Implement code/docs/config changes in **this** repo. Smallest correct diff. PR-only
to `main`. Run `npm run verify` before claiming green. Renamed from runbook “Build”
for prompt consistency — code symbols may still say `BuildApprovalRequest` until a
later rename pass.

### Knowledge
Maintain `knowledge/` (sources, concepts, projects, decisions, lessons, reference,
MEMORY, log) per Knowledge Maintenance rules. Prefer update-over-duplicate. No
customer-facing copy in this tree.

---

## Not in this system yet (not promptable lanes)

These names still appear in UI labels, approval helper types, or historical docs.
They are **not** promptable lanes under this taxonomy:

| Name | Notes |
|------|--------|
| Planner | Historical runbook role / workflows; not a prompt lane |
| Content | Historical runbook role for external copy; not a prompt lane |
| Reliability | Reserved runbook role; not wired as a prompt lane |
| Roadmap Agent | UI work-board label only |
| Workflow Gate Agent | UI work-board label only |
| Marketer Agent | UI mock row only |
| Build (as a lane name) | Use **Repo**; runbook “Build Agent” section is the same lane |

Do not write system prompts for the rows above until an explicit decision adds them.

---

## Runtime wiring gaps (honest)

- Dashboard `resolveChiefCommand()` still returns `ChiefResponse` fields; **UI now
  maps them** to the four-line format via `ChiefReplyBlock`.
- Approval TypeScript types still use names like `BuildApprovalRequest` /
  `ContentApprovalRequest` — functional, not renamed (user-facing labels say **Repo**).
- UI Agents board may still *store* “Build Agent” internally while displaying **Repo**;
  Roadmap / Workflow Gate / Marketer remain board labels, not prompt lanes
  ([AGENTS_BOARD.md](./AGENTS_BOARD.md)).
- No automatic loader injects `docs/prompts/*.md` into model calls; operators/agents
  attach them in session.

---

## Related historical docs

| Doc | Role now |
|-----|----------|
| [AGENT_RUNBOOK.md](./AGENT_RUNBOOK.md) | Detailed gates/workflows; see supersession banner at top |
| [CHIEF_VOICE_AND_COMMAND_SPEC.md](./CHIEF_VOICE_AND_COMMAND_SPEC.md) | Superseded for voice/reply contract; keep for ASR future notes |
| [BUILDER_AGENT_PACKET_SPEC.md](./BUILDER_AGENT_PACKET_SPEC.md) | Packet design for Repo (formerly Build) |
| [RESEARCH_AGENT_PACKET_SPEC.md](./RESEARCH_AGENT_PACKET_SPEC.md) | Packet design for Research |
| `docs/REPO_TRIAGE_SUMMARY.md` | Optional hygiene snapshot for Repo lane — include when that doc exists on the branch |
