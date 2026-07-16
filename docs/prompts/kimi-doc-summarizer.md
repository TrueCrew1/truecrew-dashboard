# Kimi long-context doc/ADR summarizer prompt

**Tool:** Kimi — free web chat at kimi.com (Moonshot AI, `docs/TOOL_CATALOG.md`
`kimi-free`). **External/manual only.** No version is pinned or confirmed for this
repo's use — refer to it as "Kimi (free web chat)," not by an assumed version
number.

**Role:** long-context summarizer agent (per `docs/agents/AI_TOOL_OPERATING_GUIDE.md`
§ B). Use it when a doc or ADR set is long enough that reading it end-to-end is the
actual bottleneck — not for anything short enough to just read.

**Use this for:** digesting a long doc, a stack of related ADRs/decision notes, or a
sprawling knowledge-vault thread down to something a human (or Claude Fable) can act
on quickly.

**Do not use this for:** code. Do not paste source files into this prompt, and do
not ask Kimi to propose or draft an edit — summarization only.

## Setup

Paste in the full text of the doc(s) in scope — e.g. `docs/AGENT_RUNBOOK.md` plus
the `knowledge/decisions/*.md` files it references, or a long thread of related
notes. If it's genuinely long-context (many files, tens of thousands of words),
that's exactly the case this tool is for.

## Prompt

```
You are summarizing internal engineering/product documentation for a small
SaaS team (a maintenance/field-ops command center product). I'm pasting in
[N] documents. Do not propose any code change or edit — summarization and
analysis only.

Produce exactly these four sections:

1. Concise summary
   - What these documents collectively establish, in plain language, no
     longer than half a page. Assume the reader has some context on the
     product but hasn't read these specific docs recently.

2. Key decisions
   - Every distinct decision stated across the documents (not every
     sentence — the actual "we decided X" or "X is the rule now"
     moments). One line each, with which document it came from.

3. Stale statements
   - Anything that reads like it might be outdated: references to a
     feature described as "not yet built" that other parts of the text
     imply now exists, dates or version numbers that look old relative
     to the rest, or two documents that seem to contradict each other.
     Flag these as "worth checking," not as confirmed errors — you don't
     have the live codebase to verify against.

4. Clarify/update checklist
   - A short checklist of specific questions or updates someone should
     resolve before treating these documents as current. Each item
     should be answerable with a yes/no or a one-line fix, not open-ended.

Output format: four numbered sections as above, plain text or markdown,
no code blocks unless quoting a document verbatim.
```

## After you get output

1. Bring the summary back to Chief/David — the summary itself is the input to a
   decision about what actually needs to change, not the decision.
2. If something in the "clarify/update" checklist turns into a real doc change,
   Claude Fable makes the edit and opens a normal PR.
3. See `docs/agents/AI_TOOL_OPERATING_GUIDE.md` § F ("Kimi summary → Chief decision
   → Claude Fable doc rewrite").
