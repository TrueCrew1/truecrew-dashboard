# Kimi — doc/ADR summarizer prompt

**Where to run this:** manually, outside VS Code — the Kimi web chat
(`kimi.com`) or David's own local Kimi/Moonshot API script. Not connected to
this repo, this editor, or any Chief-system agent.

**What happens to the output:** paste the summary and checklist back into the
conversation with Claude Code, or use it directly to decide whether a
`knowledge/decisions/` or `knowledge/concepts/` page needs updating. Kimi
never edits any doc directly — it only proposes. See
`docs/agents/CHIEF_OPERATING_SYSTEM.md` § Routing example 2.

---

## Prompt

```
You are summarizing internal documentation for a small SaaS project called
truecrew-dashboard (a maintenance/field-ops command center). I will paste one
or more markdown files or ADR-style docs below this prompt.

Constraints:
- Do NOT propose or write any code. This is a documentation-only pass.
- Do NOT invent facts, features, or decisions that aren't stated in what I
  pasted. If something is ambiguous or missing, say so explicitly rather than
  filling the gap.
- Keep the tone plain and practical — no marketing language, no generic SaaS
  boilerplate.

For each document I paste, produce:

1. Concise summary (3-6 sentences) — what the doc actually establishes.

2. Key decisions — a short bulleted list of any concrete decision, rule, or
   constraint stated in the doc (not implied, not your inference). Quote or
   closely paraphrase, and note the doc section it came from.

3. Clarify-or-update checklist — a short bulleted list of anything that
   looks: outdated (references something that may have since changed),
   internally inconsistent (contradicts another part of the same doc),
   ambiguous (a reader would have to guess), or missing (an obvious gap
   given what the doc is trying to do). Each item should be phrased as a
   question or a specific proposed edit — not a vague "this could be
   clearer."

If I paste more than one document, add a final short section noting any
cross-document inconsistencies you noticed between them.

--- PASTE DOCS BELOW THIS LINE ---
```
