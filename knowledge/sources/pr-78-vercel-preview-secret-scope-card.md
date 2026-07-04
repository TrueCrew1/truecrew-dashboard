---
title: PR #78 — Vercel Preview secret-scope card
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [vercel-status-checks, tool-catalog, chief-approvals]
related_prs: [78]
related_cards: []
---

# PR #78 — Vercel Preview secret-scope card

## Origin

[PR #78](https://github.com/TrueCrew1/truecrew-dashboard/pull/78). Build Log entry
covering the real, gated Build ↔ Vercel read-only status-check experiment and the
resulting card.

## Raw summary

A read-only Vercel status check (via the `mcp__claude_ai_Vercel__*` MCP tools —
`get_project`, `list_deployments`, `get_runtime_errors`) surfaced ~43 runtime errors on
Preview deployments, traced to `INTERNAL_API_SECRET` not being set in Vercel's Preview
environment scope (only Production has it). The resulting `ApprovalCard` presented
three options: (a) add the secret to Preview scope, (b) leave as-is, (c) leave as-is
and document as expected noise. Chief's recommendation: **(c)** — every browser
verification this session used mock mode, never a live-API Preview deployment, so
there's no demonstrated need for Preview to hold the secret; least-privilege plus
avoids re-flagging the same 43 errors as "new" on every future Build Health Check.

## Extracted facts

- Bug caught before shipping: an early draft referenced `APPROVAL_GATES.build[3]`,
  which doesn't exist in the code (`main`'s array only has 3 items — the runbook
  documents a 4th gate in prose that the code hasn't caught up to). Fixed with a
  literal gate string and a comment flagging the drift.
- `gh pr view 78` (2026-07-04): **still OPEN**, decision not yet made.
- Single-issue card, deliberately **not bundled** with the #57/#58 auth-fix card —
  different scope, different decision, per Approval Load discipline.

## Processed into

- [decisions/vercel-preview-secret-scope.md](../decisions/vercel-preview-secret-scope.md)
- [concepts/vercel-status-checks.md](../concepts/vercel-status-checks.md)
- [concepts/tool-catalog.md](../concepts/tool-catalog.md)
