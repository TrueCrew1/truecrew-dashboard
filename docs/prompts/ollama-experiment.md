# Ollama local-experiment prompt

**Tool:** Ollama, local — `docs/TOOL_CATALOG.md` `ollama-local`, configured via
`.env.example` (`OLLAMA_HOST`, `OLLAMA_MODEL`). Currently powers Continue.dev
autocomplete/chat in-editor, and is available as an optional Tier-1 refinement for
the Librarian agent (`LIBRARIAN_AI_ENABLED`) — **not wired to any
Planner/Build/Research/Content/Chief workflow** beyond that.

**Role:** local/private experiment agent (per
`docs/agents/AI_TOOL_OPERATING_GUIDE.md` § B). Use it when you want to try
something privately, offline, or at zero cost, before deciding whether it's worth a
real implementation.

**Use this for:** local experiments — trying an approach, sketching a rough
version of a function, comparing two ideas — where the output is disposable.

**Do not use this for:** anything that touches production repo files. Nothing from
an Ollama session gets written directly into `src/`, `api/`, `lib/`, or
`supabase/migrations/` — output goes to a scratch location and gets reviewed before
any real implementation happens.

## Setup

Run against your local Ollama install (`ollama run <model>`, or through
Continue.dev's chat panel). Point output at a scratch file outside the repo's
tracked source — e.g. this session's scratchpad directory, or an untracked local
`scratch/` folder — never directly into a tracked source file.

## Prompt

```
You are helping me sketch a local, disposable experiment for a TypeScript
SaaS codebase. This is NOT a request to produce a final implementation —
treat the output as a rough draft I will review and rebuild properly if it's
worth keeping.

What I'm trying: [one or two sentences — the idea, approach, or comparison
you want to try]

Relevant context (if any): [paste only what's needed to attempt this —
a type definition, an existing function's signature, a short example]

Output a rough sketch of the approach. Keep it small and focused on the
specific idea, not a full production implementation — no need for complete
error handling, tests, or polish. Flag anywhere you're guessing at
conventions you can't see from the context I gave you.
```

## After you get output

1. Save the output to scratch only — never commit it, never paste it directly
   into a tracked source file.
2. Bring it to Claude Fable for review: is the idea worth building for real?
3. If yes, Claude Fable builds it fresh, in the actual codebase, following this
   repo's real conventions and tests — it does not copy the Ollama draft in
   verbatim, since the draft had none of the codebase's actual context or
   standards behind it.
4. Normal PR review applies from there. See
   `docs/agents/AI_TOOL_OPERATING_GUIDE.md` § F ("Ollama experiment → Claude Fable
   review → approved implementation path").
