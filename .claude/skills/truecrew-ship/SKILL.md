---
name: truecrew-ship
description: Prepare True Crew work for shipping — verify changed files, note real test/build results and rollout risks, and produce a concise, honest ship summary.
---

# True Crew ship

Use this when work is ready to hand off for approval/deploy.

## Behavior

1. **Verify changed files.** Run `git status` and `git diff` to confirm exactly what changed —
   don't rely on memory of what you intended to change.
2. **Note test/build expectations — only what actually ran.** Run `npm run build` (and any
   relevant `npm run db:status` / migration check) and report the real result. Never state
   something was tested, built, or verified unless it was actually run in this session.
3. **Note rollout risks.** Call out anything that needs an env var, a Supabase migration, a
   Vercel env change, or another manual step — these go in an **Ops to run** section per
   [docs/AGENT_WORKFLOW.md](../../../docs/AGENT_WORKFLOW.md), not as a task for the approver to
   figure out.
4. **Produce a concise ship summary** using
   [docs/PR_SUMMARY_TEMPLATE.md](../../../docs/PR_SUMMARY_TEMPLATE.md): what changed, why, ops to
   run (or "None"), risk/follow-up.

If something wasn't tested, say so plainly instead of implying it was.
