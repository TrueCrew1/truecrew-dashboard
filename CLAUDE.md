# True Crew — Claude Code context

## What True Crew is
A SaaS command center for operations and maintenance teams. It runs the operator/supervisor
workflow — Today → Operations → Builds/Repair → Monitor → Customers → Review — on a stack of
Vercel (SPA + serverless `/api`), Supabase Postgres, GitHub webhooks (PR/CI gate automation),
and Obsidian (knowledge/logging, Phase C). See `README.md` for the stack table and routes.

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
Ask, don't assume. **Do not fabricate values** (env vars, Supabase project IDs, keys, customer
data, “shipped” capabilities). If proceeding anyway (e.g. a reasonable default is clearly right),
state the assumption explicitly so it's easy to correct. Prefer the smallest change that's
actually correct over a broader "while I'm in here" change.

## Lanes (canonical — five only)

| Lane | Contract | Touches |
|------|----------|---------|
| **Chief** | [docs/agents/CHIEF_OPERATING_SYSTEM.md](docs/agents/CHIEF_OPERATING_SYSTEM.md) + [docs/CHIEF_SINGLE_VOICE.md](docs/CHIEF_SINGLE_VOICE.md) | Local-first tool-enabled operator voice; governed tools (GitHub, Obsidian, repo); approvals for mutating/destructive actions — not silent merge/deploy |
| **Research** | [docs/prompts/RESEARCH.md](docs/prompts/RESEARCH.md) | Grounded findings — not production secrets |
| **Librarian** | [docs/prompts/LIBRARIAN.md](docs/prompts/LIBRARIAN.md) | Task-linked Obsidian / artifact filing |
| **Repo** | [docs/prompts/REPO.md](docs/prompts/REPO.md) | Code via PR only (runbook formerly called this “Build”) |
| **Knowledge** | [docs/prompts/KNOWLEDGE.md](docs/prompts/KNOWLEDGE.md) | Git-tracked `knowledge/` second brain |

System index: **[docs/AGENT_SYSTEM.md](docs/AGENT_SYSTEM.md)**.  
Chief operating policy (tools + project routing): **[docs/agents/CHIEF_OPERATING_SYSTEM.md](docs/agents/CHIEF_OPERATING_SYSTEM.md)**.  
Planner / Content / Reliability / Roadmap / Workflow Gate / Marketer are **not** promptable
lanes (see AGENT_SYSTEM “Not in this system yet”).

**Project routing:** the Chief project dropdown lists **all** projects. **Global** is only
for non-project conversations and cross-project coordination. **M&S** is a normal project
option, not a global bucket. When a project is selected, keep tools and context inside it
unless the operator changes scope. GitHub and Obsidian use that dropdown as the
context-routing source.

Tool access matrix (catalog + gates): `docs/TOOL_CATALOG.md`, `docs/AGENT_TOOL_LANES.md`.

## Endangered areas (do not casually rewrite)
- `supabase/migrations/**` and live schema
- `lib/auth.ts` / internal API auth
- GitHub webhook verification and deploy workflows that handle secrets
- Vercel / Supabase production env — human-only
- Customer-app code belongs in `TrueCrew1/ms-painting`, not here (Chief **context** seeds for M&S are OK; see `docs/PROJECT_SEPARATION_FINDINGS.md`)

## Verify before ship

Primary “is this repo clean?” command:

```bash
npm run verify    # lint + test + build (alias of npm run qa)
```

Ship gate checklist: **[docs/SHIP_CHECKLIST.md](docs/SHIP_CHECKLIST.md)**.

## Workflow
This repo already has an approval-first process — don't restate or reinvent it, follow it:
- `docs/agents/CHIEF_OPERATING_SYSTEM.md` — Chief tool use, GitHub/Obsidian surfaces, project/Global routing
- `docs/AGENT_SYSTEM.md` + `docs/CHIEF_SINGLE_VOICE.md` — lane taxonomy and Chief reply format
- `docs/AGENT_WORKFLOW.md` — agent implements, opens a PR, approver reviews/approves. Agents never
  ask the approver to run commands; anything that must run outside the agent environment goes in
  an **Ops to run** section.
- `docs/PR_SUMMARY_TEMPLATE.md` — use this template for every PR description.
- `docs/OBSIDIAN_LOGGING.md` — how decisions/PRs get logged to the vault after merge.

## Tool routing

The AI/editor tool stack itself is governed at two levels — don't restate either here,
follow them:
- **Personal VS Code/editor stack** (Claude Code + Continue.dev on local Ollama, two
  tools only) — decided and re-confirmed in `~/.claude/CLAUDE.md` (global). **Cline,
  Cline Nightly, and GitHub Copilot Chat were deliberately removed from this
  workspace** (twice) as duplicate/accumulated agent tooling — don't suggest
  reinstalling them "as an option."
- **Agent-system tool governance** — `docs/TOOL_CATALOG.md` (stable tool records) and
  `docs/AGENT_RUNBOOK.md` (detailed gates; superseded for lane *names* and Chief *reply
  format* by `docs/AGENT_SYSTEM.md` / `docs/CHIEF_SINGLE_VOICE.md`). See also
  `knowledge/reference/tool-fallbacks.md` for fallback chains.
