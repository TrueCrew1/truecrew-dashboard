# System Law — Truth / Merge Decision Table (V1)

Operator-facing decision law for Chief. This file converts runtime truth into an
approval posture. It does **not** replace the underlying evidence:
`docs/internal/chief-command-center-runtime-truth.md` remains the runtime Truth
Map, and `docs/AGENT_RUNBOOK.md` remains the governing runbook.

Use this table whenever Chief recommends **Approve**, **Escalate**, or
**Reject** on a request that depends on runtime truth, a ship claim, or a merge
readiness claim.

## Decision table

| Truth status | Meaning | Chief posture | Merge / ship posture |
|---|---|---|---|
| **REAL** | The claimed surface is live, code-backed or runtime-backed, and the request stays inside what is actually implemented. | **Approve** if the request is in scope, checks are complete, and no sensitivity override is open. | Eligible for normal merge/ship approval. |
| **PARTIAL** | Some real path exists, but the claimed surface still has a scoped gap, manual step, off-by-default path, or non-trivial limitation. | **Escalate**. Chief may only approve a request limited to the real slice and explicitly naming the gap. | Docs-only, internal, or narrowly-scoped follow-up work may proceed; do not approve a broader "fully shipped" claim. |
| **MOCK** | Demo, illustrative, static, or placeholder only; no live backing for the claimed behavior. | **Reject** for any live/ship-ready claim. Escalate only if the request is explicitly for mock labeling or mock cleanup. | Not merge-ready as a live capability. Any merge must preserve mock labeling. |
| **BLOCKED** | A real path exists, but release readiness is stopped by an unresolved defect, missing config/secret, policy hold, or human-only unblocker. | **Escalate** when David's action or decision is needed to clear the block; otherwise **Reject** as not ready. | Not merge-ready as complete/clear-to-ship until the blocker is cleared. |
| **NOT STARTED** | No implemented path or evidence exists for the claimed surface. | **Reject** for readiness or ship claims. Escalate only for prioritization or planning decisions. | Planning/docs only; not merge-ready as a shipped capability. |

## Sensitivity override

When a request touches regulated or sensitive content, Chief tightens the table
above by one step. In this repo, that includes:

- legal / terms / privacy / support-policy wording,
- client-visible or public copy,
- security / auth / external-message surfaces,
- customer-identifiable or MSHA-sensitive material.

Under this override:

- **REAL** defaults to **Escalate** until source, audience, release surface, and
  handling are explicit.
- **PARTIAL**, **MOCK**, **BLOCKED**, and **NOT STARTED** do **not** become
  approvable ship claims by wording alone.

## Citation rule

When Chief cites this law in a card or decision note, cite both:

1. the runtime evidence source (`docs/internal/chief-command-center-runtime-truth.md`
   or another named Truth Map artifact), and
2. this file for the approval posture.
