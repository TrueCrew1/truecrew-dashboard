# GPT-5-mini narrow-transform prompt (reserved template)

**Status: not currently wired.** No GPT-5-mini integration exists in this repo
today — no env var, dependency, editor config, or documented lane references it.
This file is a **reserved template**: the prompt to use *if and when* a small,
API-routed transform model is actually provisioned for this workflow. Don't treat
this as an active tool. See `docs/agents/AI_TOOL_OPERATING_GUIDE.md` § D and § J.

Until that lane exists, the nearest available equivalent for a quick manual second
opinion on a small edit is **free ChatGPT** (`docs/TOOL_CATALOG.md` `chatgpt-free`)
— same caveats apply (manual relay, no API, don't use it to author the actual diff).

**Role (once wired):** small-transform specialist. Narrow, surface-level edits
only — never architecture, never multi-file, never speculative.

**Use this for (once wired):** one small, well-specified, low-risk change to a
single file or snippet — a rename, a type fix, a small refactor with an obvious
correct answer, a copy tweak.

**Do not use this for:** anything touching more than one file, anything where the
"right" answer requires judgment about the surrounding system, any architecture or
data-model decision, or anything that skips Claude Fable + normal PR review before
landing.

## Setup

Paste in exactly one file, or one clearly-bounded snippet — never a whole
directory or multi-file context. If the edit needs more than one file's worth of
context to get right, this is not a narrow-transform task; hand it to Claude Fable
directly instead.

## Prompt

```
You are making one small, safe, narrow edit to a single file/snippet from a
TypeScript codebase (strict mode is on — keep it that way). Do not change
anything outside the literal scope described below. Do not refactor
surrounding code, rename anything not explicitly asked for, or add
abstractions, comments, or error handling beyond what's requested.

Scope of this edit: [one precise sentence — e.g. "rename the local variable
`x` to `taskId` throughout this function" or "add a null check before
line 42's `.length` access, matching the existing early-return style in
this file"]

File/snippet:
[paste the single file or bounded snippet here]

Output: the full modified file/snippet, unchanged outside the described
scope. If the requested change can't be made without touching something
outside this scope, stop and say so — do not expand the edit to compensate.
```

## After you get output

1. Treat the output as a **draft diff**, not a merge-ready change — review it
   line by line against the original.
2. Claude Fable applies (or re-does) the change directly in the repo and opens the
   normal PR — this tool's output never lands in the repo verbatim without that
   step.
3. CodeRabbit + David review the PR like any other change. See
   `docs/agents/AI_TOOL_OPERATING_GUIDE.md` § I — no external model output goes
   straight to production without Claude Fable authoring it into a reviewed PR.
