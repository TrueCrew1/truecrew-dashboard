---
title: Should INTERNAL_API_SECRET be added to Vercel's Preview scope?
type: decision
status: pending
created: 2026-07-04
updated: 2026-07-04
related_pages: [vercel-status-checks, tool-catalog]
related_prs: [78]
related_cards: []
---

# Should INTERNAL_API_SECRET be added to Vercel's Preview scope?

**Status: pending**

## What was decided

Nothing yet — PR #78 is still open, awaiting David's call between three options:
(a) add `INTERNAL_API_SECRET` to Vercel's Preview environment scope, (b) leave as-is
(gap stays), or (c) leave as-is and explicitly document it as expected noise.

## Why

A real, read-only Vercel status check (`sources/vercel-status-check-experiment.md`)
found ~43 runtime errors on Preview deployments specifically, traced to the secret
being set in Production scope only. Chief's recommendation is **(c)**: every browser
verification run this entire session used mock mode, never a live-API Preview
deployment — so there's no demonstrated need for Preview to hold the secret yet.
Least-privilege, and it prevents future Build Health Checks from re-flagging the same
43 errors as "new" each time.

## Alternatives considered

- **(a) Add to Preview scope** — would let a future live-API Preview deployment work
  correctly, at the cost of a secret existing in one more place than currently proven
  necessary.
- **(b) Leave as-is, no documentation** — rejected as Chief's recommendation, since it
  leaves the 43-error signal looking like an active, undiagnosed problem to whoever
  looks next, rather than a known, understood non-issue.

## Related PRs / cards

- PRs: #78 (open, undecided)
- ApprovalCards: the Vercel Preview secret-scope card in `agentApprovalGates.ts`
  (ships on PR #78; title falls back to the gate label since `main` doesn't yet have
  the optional `title` override field from still-open PR #70)
