---
title: Vercel Status Checks (read-only monitoring)
type: concept
status: established
created: 2026-07-04
updated: 2026-07-04
related_pages: [tool-catalog]
related_prs: [78]
related_cards: []
---

# Vercel Status Checks (read-only monitoring)

## Summary

The pattern for how Build agent may look at Vercel deploy/runtime state — strictly
read-only, no config or environment-variable writes, per the Tool Catalog's existing
classification.

## Established facts

- Real MCP tools available and used: `mcp__claude_ai_Vercel__get_project`,
  `list_deployments`, `get_runtime_errors`, `get_deployment` — all read-only.
- The one real check run this session (`sources/vercel-status-check-experiment.md`)
  found healthy Production deploys but ~43 runtime errors specific to Preview
  deployments, root-caused to `INTERNAL_API_SECRET` missing from Vercel's Preview
  environment scope. This became the input to a real `ApprovalCard` (PR #78) — see
  `decisions/vercel-preview-secret-scope.md`.
- Per the Tool Catalog, Vercel deploy status/preview URLs are `AGENT-ELIGIBLE`,
  `READ-ONLY`, no gate needed. Vercel env vars and Production project settings remain
  `HUMAN-ONLY` — nothing in this session's check touched either.

## Open questions / inference

- Whether Preview should actually receive the secret (so live-API preview testing
  works) or stay without it (least-privilege, since it's never been used in anger) is
  still an open, pending decision — not resolved by the read-only check itself, which
  only established the *fact* of the missing scope, not the *right call* on fixing it.
- No recurring cadence exists yet for this kind of check — it was a one-off experiment,
  not (yet) part of the Daily Build Health Check workflow.

## Related

- Pages: [tool-catalog](tool-catalog.md)
- PRs: #78
- Decisions: [vercel-preview-secret-scope](../decisions/vercel-preview-secret-scope.md)
