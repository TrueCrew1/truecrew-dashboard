# System Law — Truth × Merge Decision Table (V1)

Operator-facing law for True Crew V1. Cite this file (and the matching
[V1 Truth Map](./V1_TRUTH_MAP.md) row) whenever a merge or Chief approval
recommendation is made. Do not invent a merge posture that is not in this table.

**Related:** [V1 Truth Map](./V1_TRUTH_MAP.md) · [Agent Runbook — Chief Decision Rubric](./AGENT_RUNBOOK.md) · [Regulated content](../knowledge/reference/regulated-content.md)

## Truth status → merge posture

| Truth Map status | Meaning (short) | Default merge / approval posture |
|---|---|---|
| **REAL** | Evidence on disk proves the capability; gaps non-material at V1 scope | **MERGE NOW** — eligible to Approve if Decision Rubric gates also pass |
| **PARTIAL** | Real code or process exists, but scope is bounded or unfinished | **MERGE ONLY within stated scope** — Approve only if the card names the bound; otherwise Hold |
| **MOCK** | Demo/fixture path, correctly gated away from live behavior | **DO NOT MERGE AS REAL** — never Approve as production capability |
| **BLOCKED** | Implementation may exist, but a named blocker prevents honest ship | **DO NOT APPROVE AS SHIPPABLE** — Hold or Reject until an unblock plan exists |
| **NOT STARTED** / **NOT BUILT** / **NOT IMPLEMENTED** | No real path (and often no stub) | **REJECT ship claims** — Hold only if the card is explicitly “start this work” |

Labels such as “REAL — verified in practice” or “REAL code, unverified” still sit under
**REAL** or **PARTIAL** per the Truth Map row’s Phase 1 action — read the row, do not
upgrade the label in the card.

## How to apply

1. Find the capability row in [V1_TRUTH_MAP.md](./V1_TRUTH_MAP.md).
2. Take the **status** and **Phase 1 action** from that row.
3. Map status → posture using the table above.
4. Apply the Chief **Decision Rubric** in `docs/AGENT_RUNBOOK.md` (evidence, checklist,
   reversibility, blast radius, lane, regulated-content). Posture alone is not enough
   to Approve.
5. Record the cited Truth Map row + this law in the card summary or PR body when the
   decision is merge-related.

## Hard rules

- **No silent upgrades.** An agent may not label MOCK / BLOCKED / NOT STARTED work as
  REAL to force MERGE NOW.
- **BLOCKED stays BLOCKED** until the named gap is fixed and the Truth Map row is
  updated in a docs PR — not by chat assertion.
- **PARTIAL is not FULL.** Approving a PARTIAL slice requires the card to state what
  is still out of scope.
- **Regulated content.** If the change or cited knowledge notes carry
  `sensitivity: regulated` or non-empty `regs` (MSHA / OSHA / DOT / …), follow
  `knowledge/reference/regulated-content.md` in addition to this table.
- **Copilot / free chat are not law.** Tiny local edits tools must not rewrite this
  file, the Truth Map, or the Chief Decision Rubric.

## Change control

Edits to this law are Build/docs PRs through Chief’s normal gates — same as other
governance docs. Pattern-driven updates should come from the **Approval Feedback
Review** workflow in `docs/AGENT_RUNBOOK.md`, not from ad-hoc runtime behavior.
