---
title: Failure Patterns
type: pattern
status: active
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals]
related_prs: [78]
related_cards: []
---

# Failure Patterns

Mistakes worth avoiding, and why. One dated entry per learning, merged into this
single page rather than split across files.

#### 2026-07-04 — Trusting runbook prose over actual code state when drafting a gate reference

- **Pattern type:** Failure
- **Agent:** Chief (drafting a Build card)
- **Workflow:** ad hoc card creation (Vercel Preview secret-scope card, PR #78) —
  adjacent to Daily Build Health Check
- **Context:** `docs/AGENT_RUNBOOK.md`'s prose already documented a 4th
  `BuildApprovalGate` ("Changes to approval-related UX or logic"), but the actual
  `APPROVAL_GATES.build` array in code on `main` only had 3 items at the time.
- **What happened:** An early draft of the card referenced `APPROVAL_GATES.build[3]`
  — an out-of-bounds index — which would have rendered the card's title as
  "Build: undefined." Caught by `npm run qa` (well, by review before shipping) before
  it went out, not by the runtime itself catching it.
- **Outcome:** failure (caught before shipping, not caught at authoring time)
- **Why this matters:** documentation and code can drift out of sync even within the
  same repo/session, and it's easy to draft against the doc's stated intent rather
  than the array's actual current length. This is a narrow instance of a general
  class of mistake: trusting a rule's prose description over checking the literal
  data structure it's supposed to describe.
- **Next-time guidance:**
  - Repeat when: never — this is the failure, not a pattern to repeat.
  - Avoid when: drafting any card/request that references an indexed or enumerated
    gate — always check the actual array/enum length in code first, not just the
    runbook's prose description of it.
  - Check first: `grep`/read the actual `APPROVAL_GATES.*` array (or equivalent) in
    `agentApprovalGates.ts` before referencing an index into it; prefer a literal
    string match to the gate's exact text when the array and prose are known to be
    out of sync (as flagged in `knowledge/decisions/agent-runbook-adoption.md`).
- **Confidence:** medium
- **Review horizon:** review after related PR/decision merges — once
  `agent-runbook-adoption` resolves and `APPROVAL_GATES.build` gets its real 4th
  entry, this specific failure mode should stop being possible; worth re-checking
  then rather than treating this as permanent.
- **Status:** active
- **Memory worth:** success_uses: 0, failure_uses: 0
