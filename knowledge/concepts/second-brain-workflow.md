---
title: Second Brain Workflow (vault governance)
type: concept
status: active
confidence: medium
last_reviewed: 2026-07-20
created: 2026-07-04
updated: 2026-07-20
related_pages: [chief-approvals, approval-load, second-brain-setup]
related_prs: [80]
related_cards: []
---

# Second Brain Workflow (vault governance)

## Summary

The Second Brain Starter Pass is how `knowledge/` gets maintained — Chief coordinates
Research and Content to turn real work artifacts into durable pages, with Build as a
source-only provider. The vault is layered (memory index, event logs, raw capture,
durable knowledge, lessons, reference — see `docs/AGENT_RUNBOOK.md` § Memory
Architecture) and runs under explicit caps and a priority filter designed to keep it
small and high-signal. Full rules live in `docs/AGENT_RUNBOOK.md` §§ Second Brain
Starter Pass, Memory Architecture, Lessons, Knowledge Maintenance, Memory Governance —
this page is a pointer/summary, not a restatement.

## What works

- **Hard caps (first month):** concepts ≤10, projects ≤5, decisions ≤15, sources ≤50,
  lessons ≤20, reference ≤10. A candidate that would exceed its cap gets logged as a
  deferred idea in `knowledge/log.md` instead of created. `discovery/` notes are
  outside those caps but should stay high-signal and get promoted into durable pages
  when judgment stabilizes (see `knowledge/discovery/README.md`).
- **Retrieval order:** `MEMORY.md` first (0a), open only the relevant linked pages
  (0b), summarize before acting (0c) — never load the whole vault by default.
- **Priority order for what earns a page**, highest first: active projects/live
  systems → durable rules/patterns → significant ongoing decisions → ephemeral
  details (lowest, default is no page).
- **The 3–6 month test:** a page only gets created if the honest answer to "will I
  care 3–6 months from now?" is yes.
- **Lessons vs. concept pages:** a genuinely behavior-changing insight becomes a
  `lessons/*.md` file; a durable-but-descriptive one becomes/extends a `concepts/`
  page. See `docs/AGENT_RUNBOOK.md` § Lessons.
- **Discovery capture:** researchers file interviews/findings/etc. under
  `knowledge/discovery/` using templates + `reference/knowledge-schema.md`. Regulated
  content follows `reference/regulated-content.md`.
- **Three named safeguards:** no orphaned pages (reachable from `MEMORY.md` or
  `index.md`), no duplicate topics, no uncontrolled renaming.
- **Memory Review Pass** (new workflow) reviews status markers
  (active/tentative/deprecated) and merges overlapping pages, explicit-request only.

## What to check first

- `knowledge/log.md` for the most recent Second Brain pass's deferred-idea list
  before proposing a new page on a similar topic.
- The relevant cap (concepts/projects/decisions/sources/lessons/reference) before
  creating a new durable page — if it's at or near cap, prefer updating an existing
  page. Discovery notes: prefer updating an existing discovery note first.
- `knowledge/reference/knowledge-schema.md` and
  `knowledge/reference/regulated-content.md` before filing regulated or
  compliance-adjacent discovery content.

## Open questions

- These are first-month rules by design — whether the caps are the right long-term
  numbers, or need revisiting once the vault has more usage history, isn't decided.
- No case has yet arisen where a genuinely high-priority topic was blocked purely by
  a cap (all caps have wide headroom as of this pass) — the deferral mechanic is
  documented but not yet stress-tested.
- The Memory Review Pass hasn't been run for real yet — nothing in the vault is old
  enough to genuinely need it.

## Related

- Decisions: none — this is a rule set, not a one-time decision
- Sources: [second-brain-governance-rules](../sources/second-brain-governance-rules.md)
- Lessons: none yet — see the Second Brain Starter Pass's own meta-learning step
  (Step F) for where one would come from
