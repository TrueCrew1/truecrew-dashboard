# True Crew workflow checklists

Short, practical checklists for common work. Pair with [project-rules.md](project-rules.md) and
[docs/AGENT_WORKFLOW.md](../docs/AGENT_WORKFLOW.md) for the full process.

## Feature build
- [ ] Confirm the goal in one sentence — what does the user get that they don't have now?
- [ ] Check `src/pages`, `src/components`, `src/lib/api` for an existing pattern to extend
- [ ] Implement in small, sequenced steps
- [ ] Verify basic behavior (run it, don't just read it)
- [ ] Open PR with [docs/PR_SUMMARY_TEMPLATE.md](../docs/PR_SUMMARY_TEMPLATE.md)

## Bug fix
- [ ] Reproduce the bug before changing anything
- [ ] Find the root cause — don't patch a symptom
- [ ] Make the smallest fix that addresses the root cause
- [ ] Verify the original repro is fixed and nothing adjacent broke
- [ ] Note the root cause in the PR summary

## UI polish
- [ ] Confirm the specific screen(s)/state(s) in scope
- [ ] Check mobile/tablet layout, not just desktop
- [ ] Check empty, loading, and error states, not just the happy path
- [ ] Match existing component patterns in `src/components/ui`
- [ ] No placeholder copy left behind

## Refactor
- [ ] Confirm there's no behavior change intended — state that explicitly in the PR
- [ ] Keep the diff scoped to the stated refactor, nothing else
- [ ] Verify build/type-check passes (`npm run build`)
- [ ] Spot-check the affected screens still behave the same

## Deployment readiness
- [ ] `npm run build` passes clean
- [ ] Env vars needed are documented in `.env.example` and `docs/VERCEL_SUPABASE_SETUP.md`
- [ ] Supabase migrations applied/checked (`npm run db:status`)
- [ ] Any manual/ops step is called out under **Ops to run** in the PR, per
      [docs/DEPLOY_NOW.md](../docs/DEPLOY_NOW.md)

## Docs update
- [ ] Confirm which doc is the source of truth (repo `docs/` vs. live Obsidian vault)
- [ ] Update the repo doc if it's process/setup; log decisions/PRs via `npm run obsidian:log` per
      [docs/OBSIDIAN_LOGGING.md](../docs/OBSIDIAN_LOGGING.md)
- [ ] Don't duplicate content that already lives in another doc — link to it instead
