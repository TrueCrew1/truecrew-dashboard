# Librarian System Operating Specification

**Status:** Proposed subsystem — not yet implemented
**Version:** v1.2 (design draft)
**Scope:** True Crew Second Brain (Obsidian) + Agent OS

This document describes a **future Librarian subsystem** for True Crew. It
defines how a Librarian agent and its lanes *should* operate once wired, but
it does **not** claim that all lanes exist or are active today.

The current, live agent/tool wiring is documented in:

- `docs/AGENT_CAPABILITIES_SUMMARY.md`
- `docs/AGENT_TOOL_LANES.md`

Those files remain the authoritative description of what is actually
running in the system right now. **When there is a conflict between this
spec and the current agent docs, the agent docs win** until an
implementation decision and wiring update bring them into alignment. In
particular, as of this writing:

- DeepSeek V4 Pro and Kimi K2.6 are **Partially wired** Azure AI Foundry
  deployments used only as Chief's fallback text completion
  (`docs/AGENT_CAPABILITIES_SUMMARY.md`) — not the autonomous, vault-aware
  lanes described in Section 2 below.
- Gemini has no row in `docs/TOOL_CATALOG.md` and is not wired at all.
- No `target_agent`/`approval` payload schema exists in code today (Section
  8 is a design proposal, not a description of an implemented type).
- No distinction between "Claude (Planner)" and "Claude Code" as separate
  governance roles exists in `docs/AGENT_RUNBOOK.md` or
  `docs/agents/CHIEF_OPERATING_SYSTEM.md` today.

Nothing in this document authorizes an agent to act as if these lanes are
live. Treat every section below as a design target pending Human Governance
review and a separate implementation pass.

---

## Section 2 — Division of Labor (Proposed)

| Lane | Proposed role | Notes |
|---|---|---|
| DeepSeek | Second-order modeling / analysis (reasoning, pattern inference beyond literal vault state) | Today: Chief's Partially-wired Azure fallback model only — see conflict note above |
| Kimi Chat | Vault-state facts (current, observable state of notes/links/frontmatter/folders) | Today: Chief's Partially-wired Azure fallback model only — see conflict note above |
| Gemini | Human-facing summarization (audits, reports) | Not wired in this repo today |
| Claude (Planner) | Decides, plans, reviews, or amends the spec; produces approved diff plans | No implemented split from Claude Code today |
| Claude Code / Local Scripts | Execution and refactor lane; applies approved diffs, edits files, updates schemas, logs work | Does not design policy or decide what to change |
| Cursor / CI-CD | Code-side execution of approved changes; runs CI/CD pipelines | Existing real lane is "Build execution" per `docs/AGENT_TOOL_LANES.md` — not currently an AI-routing target |
| Human / Governance | Approval authority; ratifies policy; supplies `approval.approved_by` | — |

This table was reconstructed from the routing intent described in planning
conversation (no prior on-disk v1.1 table existed to diff against). It has
not been independently confirmed against a separately-approved source
table and should be reviewed by Human Governance before being treated as
binding.

### 2.1 Analysis Lane Boundary [PROPOSED — needs Human Governance sign-off]

> This wording was drafted to fill the gap during spec authoring — no
> verbatim source text was supplied. Do not treat as ratified until a human
> reviews and confirms it.

**Kimi Chat** owns vault-state facts: the current, observable state of
notes, links, frontmatter, and folder structure in the Obsidian vault.
Its outputs are fact reports about what the vault *is* right now.

**DeepSeek** owns second-order modeling: inference, forecasting, and
cross-referencing that goes beyond the vault's literal current state (for
example, pattern detection across time, predictive routing suggestions,
risk modeling). Its outputs are model-based proposals and must be flagged
as such before reaching Claude (Planner).

Neither lane may execute changes directly. Only Claude Code / Local
Scripts or Cursor / CI-CD may execute, and only against a plan carrying a
valid `approval` object per Section 8.

---

## Section 8 — Payload Schema (Design Proposal, Not Implemented)

No code in this repo currently defines a `target_agent` enum or an
`approval` object (confirmed by search — no matches for `target_agent` in
`.ts`/`.tsx`/`.md`). The shape below is a design proposal for a future
implementation, not a description of existing code.

```ts
type TargetAgent =
  | "deepseek"
  | "kimi-chat"
  | "gemini"
  | "claude-planner"
  | "claude-code"
  | "cursor";

interface ApprovalBlock {
  required: boolean;
  approved_by: string | null;
  approved_at: string | null; // ISO timestamp
  scope_note: string;
}

interface LibrarianPayload {
  target_agent: TargetAgent;
  phase: "analysis" | "execution";
  approval: ApprovalBlock;
  // ...remaining payload fields out of scope for this delta
}
```

Validation rule (proposed): when `phase === "execution"`,
`approval.required` must be `true` and `approval.approved_by` must be
non-null. Claude Code and Cursor must refuse to execute a payload where
`phase === "execution"` and `approval.approved_by` is `null`.

Implementing this schema in code (types, validation, and any call sites)
is separate, unscoped follow-up work — not done as part of this spec
update.

---

## Change Log

- 2026-07-20 — v1.2: initial persisted spec file. No v1.1 file was found
  anywhere in this repo, its branches/worktrees, or the Obsidian vault —
  v1.1 existed only in planning/chat and was never stored on disk. This
  file is written as a **Proposed subsystem** design draft, not as a
  description of current runtime behavior. See conflict notes above
  against `docs/AGENT_CAPABILITIES_SUMMARY.md` and
  `docs/AGENT_TOOL_LANES.md`.
