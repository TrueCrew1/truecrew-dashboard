---
title: PR #58 auth fix — blocked on secret-rotation confirmation
type: decision
status: pending
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals]
related_prs: [57, 58]
related_cards: [apr-build-duplicate-auth-prs]
---

# PR #58 auth fix — blocked on secret-rotation confirmation

**Status: pending**

## What was decided

Not yet decided in substance — but part of the original problem *has* resolved itself:
**PR #57 is now closed** (independently, outside this vault's tracked decisions). What
remains open: merge PR #58 (the surviving trim fix for `lib/auth.ts`), gated on
confirming Production's `INTERNAL_API_SECRET`/`x-internal-key` rotation is actually
complete — a confirmation that has never been logged anywhere in the Build Log or this
vault.

## Why

Both PR #57 and PR #58 fixed the same real 401 bug (trimming the internal API secret
and header before a timing-safe comparison) with byte-for-byte identical diffs. #58's
body is more thorough (more affected routes named, more defect classes checked) and
self-identifies as the one that should survive. Both PR bodies explicitly state:
"don't merge until secret rotation is confirmed complete" — because the trim fix only
actually resolves the 401 if the *currently stored* Production secret is the clean,
rotated value, and a redeploy is required after rotation for that to take effect.
Merging without that confirmation risks shipping a fix that doesn't actually fix
anything in the currently-deployed environment.

## Alternatives considered

- **Merge #58 now, without waiting for confirmation** — rejected; the precondition
  exists precisely because merging without it wouldn't reliably fix the live bug, and
  could mask the real problem (a live 401) behind a merged-looking PR.
  `recommendedDecision` on the associated card is deliberately **"hold,"** not
  "approve," even though the code risk itself is low.
- **Close both, start over** — not considered; the code fix itself isn't in question,
  only the deployment precondition.

## Related PRs / cards

- PRs: #57 (closed), #58 (open, still blocked)
- ApprovalCards: `apr-build-duplicate-auth-prs` (`BUILD_REQUEST_DUPLICATE_AUTH_FIX` in
  `agentApprovalGates.ts`) — **note:** this card's text still describes PR #57 as
  "open," a known staleness not yet corrected in code (flagged in the Build Log,
  out of scope for prior PRs that touched this file).

## What only David can clear

A personal checklist, not verifiable by any agent: the Vercel Production env value for
`INTERNAL_API_SECRET` has no trailing newline, `VITE_INTERNAL_KEY` matches, a redeploy
happened after rotation, and `/api/health` returns 200. Once confirmed, the mapped
action is `gh pr merge 58 --squash` then `gh pr close 57 --comment "Superseded by #58"`
— prepared, not run, pending this confirmation.
