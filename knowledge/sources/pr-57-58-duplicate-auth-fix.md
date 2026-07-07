---
title: PR #57 vs #58 — duplicate auth-trim fix
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals]
related_prs: [57, 58, 68, 69, 70]
related_cards: [apr-build-duplicate-auth-prs]
---

# PR #57 vs #58 — duplicate auth-trim fix

## Origin

[PR #57](https://github.com/TrueCrew1/truecrew-dashboard/pull/57) (closed) and
[PR #58](https://github.com/TrueCrew1/truecrew-dashboard/pull/58) (open). Build Log
entries: "Build agent wired with a real request" (PR #68), "PR #57/#58 analyzed; real
blocker surfaced" (PR #70), "Secret-rotation gate: guidance given, card reworded" (PR
#70 follow-up commit).

## Raw summary

Both PRs trim `INTERNAL_API_SECRET` and the `x-internal-key` header before the
timing-safe comparison in `lib/auth.ts` — byte-for-byte identical diffs, opened 8
minutes apart. Both green on CI, both mergeable. #58's PR body is more thorough (names
4 additional affected routes beyond #57's two, documents additional defect checks) and
self-identifies as the one that should survive. Both PR bodies gate merge on "David
confirms Production secret rotation is complete" — a precondition that was never
confirmed anywhere on record as of the analysis pass.

## Extracted facts

- Re-verified 2026-07-04: **PR #57 is now CLOSED. PR #58 is still OPEN**, mergeable.
  So half of the original duplicate-PR problem has resolved itself independently
  (#57 closed) — but #58's own merge precondition (secret rotation confirmed +
  redeploy) has **not** been confirmed anywhere in this vault or the Build Log.
- `lib/auth.ts` on `main` still lacks the trim fix as of the last check recorded in the
  Build Log — meaning the underlying 401 bug this fix addresses may still be live in
  production, pending rotation confirmation and merge of #58.
- The `BUILD_REQUEST_DUPLICATE_AUTH_FIX` card in `agentApprovalGates.ts` still
  describes #57 as "open" — a known, previously-flagged staleness in that card's text,
  not yet corrected in code as of this note.

## Processed into

- [decisions/auth-fix-secret-rotation.md](../decisions/auth-fix-secret-rotation.md)
  (pending — the real open question is the rotation confirmation, not the code)
