# True Crew — Claude Code context

## What True Crew is
A SaaS command center for operations and maintenance teams. It runs the operator/supervisor
workflow — Today → Operations → Builds/Repair → Monitor → Customers → Review — on a stack of
Vercel (SPA + serverless `/api`), Supabase Postgres, GitHub webhooks (PR/CI gate automation),
and Obsidian (knowledge/logging, Phase C). See `README.md` for the full stack table and routes.

## Target users
Supervisors and operators managing field/maintenance work day to day — not generic SaaS admins.
They need fast status checks, clear next actions, and workflows that hold up on a phone or
tablet in the field, not a dashboard built for a desk.

## Product tone
Industrial, plain, practical. No marketing fluff, no startup-generic phrasing.

Heads up: `src/data/mockData.ts` currently skews generic-SaaS ("Billing API rate limiter",
"Acme Corp onboarding") rather than maintenance/field-ops. Treat that as legacy placeholder to
correct over time, not as a model for tone in new work.

## Current founder priorities
Solo founder, shipping fast and practically. Minimize back-and-forth — get to a correct, small
change with high quality and low manual effort. Avoid work that requires babysitting.

## Coding preferences
- TypeScript strict mode is on (`tsconfig.json`) — keep it that way.
- Follow existing structure: `src/pages` (route-level), `src/components/{chief,dashboard,layout,tasks,ui}`,
  `src/context` (React context), `src/lib/api`, `api/` (Vercel serverless), `supabase/migrations`.
- Use the `@/*` path alias (`@/* -> src/*`), matching existing imports.
- Don't introduce a new state-management library, styling system, or data-fetching pattern —
  extend what's already there.

## UX expectations
- Built for supervisors/operators in the field: mobile-practical, thumb-friendly, low-friction.
- Real empty states and error states everywhere — no dead ends, no silent failures.
- Every screen should answer "what do I do next" for someone standing on a job site.

## What to avoid
- Inventing features, APIs, integrations, or product claims that aren't already in the repo or
  explicitly requested. If it's not in the code or the ask, don't imply it exists.
- Adding new dependencies without a clear, stated reason.
- Rewriting working code instead of editing it.
- Building automation, hooks, or infrastructure beyond what's asked — this is a solo-founder repo,
  not a platform team's.

## When uncertain
Ask, don't assume. If proceeding anyway (e.g. a reasonable default is clearly right), state the
assumption explicitly so it's easy to correct. Prefer the smallest change that's actually correct
over a broader "while I'm in here" change.

## Workflow
This repo already has an approval-first process — don't restate or reinvent it, follow it:
- `docs/AGENT_WORKFLOW.md` — agent implements, opens a PR, approver reviews/approves. Agents never
  ask the approver to run commands; anything that must run outside the agent environment goes in
  an **Ops to run** section.
- `docs/PR_SUMMARY_TEMPLATE.md` — use this template for every PR description.
- `docs/OBSIDIAN_LOGGING.md` — how decisions/PRs get logged to the vault after merge.
