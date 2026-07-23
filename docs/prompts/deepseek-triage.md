# DeepSeek repo-triage prompt

**Tool:** DeepSeek — free web chat at chat.deepseek.com (`docs/TOOL_CATALOG.md`
`deepseek-free`). **External/manual only** — this is not an editor-native or
API-wired tool in this repo. There is no CLI, MCP server, or script that calls
DeepSeek automatically; you run this by hand, or via your own local script that
copies file contents into the chat.

**Role:** repo-triage specialist agent (per `docs/agents/AI_TOOL_OPERATING_GUIDE.md`
§ B). DeepSeek reads and flags; it does not decide and does not edit.

**Use this for:** a repo-scale sweep looking for duplication, coverage gaps, or
integration risk that would be tedious to spot file-by-file.

**Do not use this for:** applying any fix. Every finding below is a *claim*,
not a fact — Claude Fable verifies each one against the actual code before
anything becomes a PR.

## Setup

Paste in whichever files or directories are in scope for this triage pass — e.g. a
feature's directory (`lib/librarian/`), a mapper layer (`lib/mappers/`), or a whole
`src/components/<area>/` tree. Don't paste the whole repo at once; scope it to what
you're actually worried about.

## Prompt

```
You are doing a repo-triage pass on a TypeScript codebase for a SaaS command
center (operator/supervisor tool for field/maintenance teams). I'm pasting in
[N] files from [area/directory]. Do NOT suggest edits or rewrite anything —
this is triage only, output a report.

Look for exactly these four things, in this order:

A. Stranded or duplicate code
   - Functions/components that appear unused (no import site in what I've
     pasted) — flag as "possibly unused, verify call sites outside this
     selection" rather than asserting it's dead.
   - Near-duplicate logic across files that could plausibly be the same
     helper — name both locations, don't guess at how to merge them.

B. Test coverage gaps
   - Exported functions/components with no corresponding test file or
     obvious test case among what I've pasted.
   - Edge cases visible in the code (error branches, empty/null handling,
     fallback logic) that don't look exercised by any test you can see.

C. Config / integration risks
   - Places where config, env vars, or external API assumptions look
     fragile (unchecked optional values, silent fallbacks, hardcoded
     values that look like they should be config).
   - Anything that looks like it silently swallows an error instead of
     surfacing it, or vice versa (hard-fails where the rest of the
     codebase looks fail-open, or fail-open where it should be a hard
     failure).

D. Top 3 recommended fixes
   - From everything flagged above, pick the 3 highest-value,
     lowest-risk fixes. Rank by (impact if wrong) x (how cheap the fix
     looks), not by volume of findings.

Output format: four sections (A/B/C/D) as above. For every finding, cite the
exact file and, if visible, function/line. Do not propose code. Do not claim
certainty — say "looks like" / "worth checking" where you're inferring from
partial context, since you only have the files I pasted, not the whole repo.
```

## After you get output

1. Bring the raw output back to Claude Fable (paste it in, or save it and
   reference it) — don't act on it directly.
2. Claude Fable checks each claim against the real repo (full context DeepSeek
   didn't have) before anything becomes a change.
3. Anything that survives verification becomes a normal PR, reviewed by
   CodeRabbit + David like any other change — see
   `docs/agents/AI_TOOL_OPERATING_GUIDE.md` § F ("DeepSeek triage → Claude Fable
   validation → PR").
