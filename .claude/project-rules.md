# True Crew project rules

- **Keep changes scoped.** Do only what the request asks. No drive-by refactors, no "while I'm in
  here" cleanups bundled into an unrelated change.
- **Prefer editing over rewriting.** If existing code works, modify it — don't replace it with a
  rewrite to make it "cleaner."
- **No unnecessary abstractions.** Match the patterns already in `src/pages`, `src/components`,
  `src/context`, `src/lib/api`. Three similar lines beat a premature helper.
- **No fake data unless clearly labeled.** `src/data/mockData.ts` is the one sanctioned mock
  source, and it's labeled as such. Don't add ad-hoc fake data elsewhere or leave it unlabeled.
- **No placeholder copy in final UI.** No "Lorem ipsum," no shipped "TODO" strings, no
  fill-in-later labels in anything a user sees.
- **Preserve industrial/operations tone.** Copy should read like it's written for a supervisor on
  a job site, not a generic SaaS landing page. `src/data/mockData.ts` currently drifts toward
  generic-SaaS phrasing ("Billing API rate limiter," "Acme Corp onboarding") — don't extend that
  drift in new work; correct it where you touch it.
- **Optimize for practical supervisor/field workflows**, not abstract configurability. Build for
  the actual job (checking status, advancing a task, flagging a blocker), not a hypothetical
  admin panel.
- **Favor readable, modular code** consistent with the existing page/component structure.
- **Explain tradeoffs briefly** (1-3 sentences) when a change involves a meaningful architecture
  choice — not a design doc, just enough for the founder to sanity-check it.
- **Route changes through the existing workflow.** Every change follows
  [docs/AGENT_WORKFLOW.md](../docs/AGENT_WORKFLOW.md): implement, open a PR using
  [docs/PR_SUMMARY_TEMPLATE.md](../docs/PR_SUMMARY_TEMPLATE.md), let the approver review. Never ask
  the approver to run commands — put anything that must run outside the agent in an **Ops to run**
  section. Agent ecosystem law (Chief, gates, approval discipline):
  [docs/AGENT_CONSTITUTION.md](../docs/AGENT_CONSTITUTION.md). See
  [docs/EXECUTION_KIT.md](../docs/EXECUTION_KIT.md) for which lane (tool/agent) should handle a
  given task and for copy-paste kickoff prompts.
