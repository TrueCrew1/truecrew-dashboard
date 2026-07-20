# Regulated content policy

Durable rules for knowledge notes that touch regulated operations domains (mining /
maintenance / transport / environmental compliance, etc.). This is vault policy —
not a substitute for legal advice.

## What counts as regulated content

A note is **regulated content** when it discusses, interprets, or guides behavior
under a regulator or regulated program, including but not limited to:

- **MSHA**, **OSHA**, **DOT** (core for TrueCrew today)
- Later: **EPA**, **FRA**, **PHMSA**, state-level bodies (`STATE` / `STATE-XX`)

Also treat as regulated when the note includes or implies compliance procedures,
citation risk, inspection readiness, or required recordkeeping — even if no agency
code is named yet (set `regs: [OTHER]` until clarified).

## How it must be tagged

On every such note (discovery or decision):

1. `sensitivity: regulated`
2. `regs: [...]` with applicable codes from
   [knowledge-schema.md](knowledge-schema.md)
3. Honest `truth_level` — do not mark `validated` without a named source or decision
4. Prefer `status: draft` until a human reviews compliance-adjacent claims

## External-tool restrictions

- Do **not** paste regulated content, MSHA-sensitive detail, or customer-identifiable
  data into NON-PROD web tools (e.g. Grok) or ungoverned free chats.
- Prefer **validated internal knowledge** and Perplexity only with scrubbed /
  non-identifying prompts when desk research is needed.
- Bulk / automated research stays on governed Azure/API lanes — not consumer chat
  paste of regulated notes.
- No exporting regulated notes to public channels, marketing copy, or client-facing
  docs without the normal Content / Chief approval path.

## How agents may change validated regulated notes

- Agents may **propose** edits (PR, ApprovalCard, or draft note) — they do **not**
  silently overwrite `truth_level: validated` regulated notes.
- Changes to validated regulated notes require human review (Chief card or explicit
  founder approval).
- Hypotheses stay in `discovery/assumptions/` or `truth_level: hypothesis` findings —
  never promoted to policy by an agent alone.

## Decisions and runbooks must cite

When a decision, approval, or runbook step relies on regulated knowledge:

- Cite **note `id`s** (and paths) used
- Cite applicable **`regs`** codes
- State whether the underlying note is `validated` or still `hypothesis` /
  `reported`

Uncited regulated claims are not trusted product truth.

## Related

- [knowledge-schema.md](knowledge-schema.md)
- `docs/AGENT_RUNBOOK.md` § Second Brain Usage / Knowledge Maintenance
- `docs/TOOL_CATALOG.md` § Research tools (Perplexity primary; Grok constrained)
