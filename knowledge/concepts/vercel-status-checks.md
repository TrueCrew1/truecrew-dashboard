---
title: Vercel Status Checks (read-only monitoring)
type: concept
status: active
confidence: medium
last_reviewed: 2026-07-04
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

## What works

- Real MCP tools available and used: `mcp__claude_ai_Vercel__get_project`,
  `list_deployments`, `get_runtime_errors`, `get_deployment` — all read-only.
- The one real check run this session found healthy Production deploys but ~43
  runtime errors specific to Preview deployments, root-caused to
  `INTERNAL_API_SECRET` missing from Vercel's Preview environment scope. This became
  the input to a real `ApprovalCard` (PR #78) — see
  `decisions/vercel-preview-secret-scope.md`.
- Per `reference/tool-access.md`, Vercel deploy status/preview URLs are read-only, no
  gate needed. Vercel env vars and Production project settings remain human-only.

## What to check first

- `decisions/vercel-preview-secret-scope.md` before re-investigating the Preview
  secret-scope gap — it's already analyzed and awaiting a decision, not open research.
- `reference/tool-access.md` to confirm current access boundaries before any Vercel
  call.

## Open questions

- Whether Preview should actually receive the secret (so live-API preview testing
  works) or stay without it (least-privilege, since it's never been used in anger) —
  not resolved by the read-only check itself, which only established the fact of the
  missing scope, not the right call on fixing it.
- No recurring cadence exists yet for this kind of check — it was a one-off
  experiment, not yet part of the Daily Build Health Check workflow.

## Related

- Decisions: [vercel-preview-secret-scope](../decisions/vercel-preview-secret-scope.md)
- Sources: [vercel-status-check-experiment](../sources/vercel-status-check-experiment.md), [pr-78-vercel-preview-secret-scope-card](../sources/pr-78-vercel-preview-secret-scope-card.md)
- Lessons: none yet
