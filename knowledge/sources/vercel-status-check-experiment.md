---
title: Build ↔ Vercel read-only status-check experiment
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [vercel-status-checks, tool-catalog]
related_prs: [78]
related_cards: []
---

# Build ↔ Vercel read-only status-check experiment

## Origin

A gated experiment run earlier this session, ahead of PR #78: using the connected
`mcp__claude_ai_Vercel__*` MCP tools to check real deploy/runtime status for the
True Crew dashboard project, scoped strictly to `READ-ONLY` per the Tool Catalog's
existing classification (Vercel deploy status = `AGENT-ELIGIBLE`, `READ-ONLY`, no gate
needed for reading).

## Raw summary

Called `get_project`, `list_deployments`, and `get_runtime_errors` (read-only) against
the real Vercel project. Found the latest deployments healthy, but `get_runtime_errors`
surfaced roughly 43 runtime errors on **Preview** deployments specifically (Production
unaffected). No write/config tool was called — the experiment stayed within the
Tool Catalog's stated boundary (`READ-ONLY` for deploy status; Production project
config remains `HUMAN-ONLY`).

## Extracted facts

- This was the first real (non-illustrative) exercise of the Tool Catalog's
  "Build ↔ Vercel, READ-ONLY" priority-candidate entry — proof the classification
  holds up in practice, not just on paper.
- The 43 Preview runtime errors, once root-caused, became the direct input to the
  PR #78 ApprovalCard (`INTERNAL_API_SECRET` missing from Preview scope) — see
  `knowledge/sources/pr-78-vercel-preview-secret-scope-card.md`.
- No production impact — the finding is Preview-only.

## Processed into

- [concepts/vercel-status-checks.md](../concepts/vercel-status-checks.md)
- [concepts/tool-catalog.md](../concepts/tool-catalog.md)
- [decisions/vercel-preview-secret-scope.md](../decisions/vercel-preview-secret-scope.md)
