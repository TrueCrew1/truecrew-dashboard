---
title: Chief governance status — #136/#137 merged, #121/#122/#123 stack pending
type: decision
status: pending
confidence: high
last_reviewed: 2026-07-18
created: 2026-07-18
updated: 2026-07-18
related_pages: [tool-catalog]
related_prs: [136, 137, 121, 122, 123]
related_cards: []
---

# Chief governance status — #136/#137 merged, #121/#122/#123 stack pending

**Status: pending** — the governance PRs below are merged; the voice/AI-fallback
runtime stack's fate is not yet decided (see Options below).

## Merged governance PRs

`#136` (tool lanes & AI routing) and `#137` (Chief phase 1 access links) are
merged into `main` at `9cbb98b`.

- Established `docs/AGENT_TOOL_LANES.md` as the canonical, single-table lane
  matrix (READ-ONLY / PROPOSE-ONLY / EXECUTE-WITH-APPROVAL) for the tools it
  classifies, including Ollama and CodeRabbit for the first time.
- Established `docs/internal/tool-model-routing-standard.md` as the
  task → tool → model tiering standard (Tier 0 no-LLM, Tier 1 local/cheap via
  Ollama, Tier 2–3 hosted/frontier), wired into `docs/AGENT_RUNBOOK.md` § Tool
  Catalog.
- Formalized Chief's Phase 1 access links in `docs/AGENT_RUNBOOK.md` § Chief
  and `docs/AGENT_WORKFLOW.md`: Ollama/local-first model routing, Obsidian
  logging, and Claude Code as the PR-only execution lane — explicitly the
  *only* links formalized this phase, with external-system writes still gated.

## Chief voice / AI fallback stack (#121/#122/#123)

`#121`, `#122`, and `#123` are draft PRs rooted on
`claude/chief-ai-voice-v1-c7q9n5`. They are ~32 commits behind `main`, and are
primarily runtime code — `lib/chief-ai/*` (Azure/Ollama fallback router),
`/api/chief/ask.ts`, Chief voice UI components, and a `vercel.json` change —
not governance docs.

These PRs were not merged as part of governance-only work; merging them
requires a separate, explicit runtime-code review and rebase onto current
main.

## Options (no decision made yet)

- Rebase the stack onto current `main` and re-open as a runtime feature PR.
- Park/shelve the stack and keep governance-only Chief for now.
- Break the stack into smaller runtime PRs later (e.g., API, routing, voice
  UI separately).

Decision owner: David; agents must not merge or mark these PRs ready without
explicit approval.
