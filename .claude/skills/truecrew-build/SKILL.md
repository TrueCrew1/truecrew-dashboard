---
name: truecrew-build
description: Build a new feature or change for True Crew in a focused, production-minded way — clarify the goal, reuse existing patterns, implement in small steps, verify, and summarize.
---

# True Crew build

Use this when implementing a new feature, page, or behavior change in the True Crew dashboard.

## Behavior

1. **Clarify the goal.** State in one sentence what the user gets that they don't have now. If the
   request is ambiguous about scope, ask before writing code — see [CLAUDE.md](../../../CLAUDE.md)
   "When uncertain."
2. **Inspect existing patterns first.** Before writing new code, check for a matching pattern in
   `src/pages`, `src/components/{chief,dashboard,layout,tasks,ui}`, `src/context`, `src/lib/api`,
   `api/`, or `supabase/migrations`. Reuse it rather than inventing a new one.
3. **Propose small, safe steps.** Break the work into a short sequence (data/migration → API →
   component → wiring), not one large change.
4. **Implement in sequence**, following [project-rules.md](../../project-rules.md) — scoped
   changes, no unneeded abstractions, industrial/operations tone in any user-facing copy.
5. **Verify basic behavior.** Run `npm run build` (and `npm run dev` / `npm run dev:vercel` if the
   change is interactive) and actually exercise the change — don't assume it works from reading it.
6. **Summarize what changed.** List the files touched and why, then hand off using
   [docs/PR_SUMMARY_TEMPLATE.md](../../../docs/PR_SUMMARY_TEMPLATE.md) per
   [docs/AGENT_WORKFLOW.md](../../../docs/AGENT_WORKFLOW.md).

Never invent an API, integration, or feature claim not already present in the repo or explicitly
requested — flag the gap instead.
