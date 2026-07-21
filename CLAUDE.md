# True Crew — Claude Code context

## Start here — agent bootstrap

**Chief is the front door.** Every agent's output — Planner, Build (Claude
Code, this session), Research, Content — reaches David only through a Chief
`ApprovalCard`, never directly. Chief is also the router to whichever
AI tool/model (if any) a piece of work should use. Chief is a router and
approval layer, not a live orchestrator — it doesn't dispatch other agents
as subprocesses. Full definition, role map, and routing reasoning:
`docs/agents/CHIEF_OPERATING_SYSTEM.md`.

**Authoritative docs, in precedence order** — each states plainly it defers
to the others on conflict; don't re-derive policy from a summary when the
source it's derived from disagrees:
1. `docs/AGENT_RUNBOOK.md` — the operating contract: approval gates per
   agent, Chief Intake Rule, Build Agent operating checklist, Change Control.
2. `docs/TOOL_CATALOG.md` — the machine-readable tool/model record.
3. `docs/agents/CHIEF_OPERATING_SYSTEM.md` — what Chief is, role map, tool
   routing reasoning, § 7 readiness checklist.
4. `docs/AGENT_CAPABILITIES_SUMMARY.md` — fast, citable "is X wired?"
   lookup, derived from 1–3.
5. `docs/AGENT_TOOL_LANES.md` — Claude Desktop/Code tool-extension access
   levels.

**Verification standard.** "Verified" means citable, right now, in this
repo's code, config, env, or docs — never asserted from memory. Anything
short of that gets the accurate label instead: **Partially wired** (real but
gated/scoped/off by default), **Manual** (human-run, zero agent access),
**External** (unclassified third-party service), **Proposed** (an idea, not
implemented), or **Placeholder** (scaffold code, no live function). Full
definitions: `docs/AGENT_CAPABILITIES_SUMMARY.md` § The verification
standard.

**Build Agent behavior** (this session, doing real repo work): inspect only
the files a task needs; confirm branch and uncommitted state before
starting; one small, reversible slice per task; run real local checks and
report the actual result — never claim a check ran that didn't; commit,
push, or open a PR **only when explicitly instructed** for that task. Full
checklist: `docs/AGENT_RUNBOOK.md` § Build Agent → Operating checklist.

**"Ready to work" means:** role clarity + tool authorization + model routing
status + approval boundaries + the verification standard above + this work
pattern + Chief as front door — all satisfied for the task at hand. If any
of those looks unmet, that's a real gap to flag, not something to route
around. Full checklist: `docs/agents/CHIEF_OPERATING_SYSTEM.md` § 7.

**Read first, in order, for any agent-governance-relevant task:** this
section → `docs/agents/CHIEF_OPERATING_SYSTEM.md` → the matching agent-role
section in `docs/AGENT_RUNBOOK.md` → `docs/AGENT_CAPABILITIES_SUMMARY.md` if
the task touches a specific tool/model. Everything below this section in
this file is product and coding context, not agent governance — read it next
for any actual code change.

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

## Tool routing

The AI/editor tool stack itself is governed at two levels — don't restate either here,
follow them:
- **Personal VS Code/editor stack** (Claude Code + Continue.dev on local Ollama, two
  tools only) — decided and re-confirmed in `~/.claude/CLAUDE.md` (global). **Cline,
  Cline Nightly, and GitHub Copilot Chat were deliberately removed from this
  workspace** (twice) as duplicate/accumulated agent tooling — don't suggest
  reinstalling them "as an option."
- **Agent-system tool governance** (which of Chief/Planner/Build/Research/Content/
  Reliability may use which tool, at what access level) — `docs/TOOL_CATALOG.md`
  (the stable record) and `docs/AGENT_RUNBOOK.md` §§ Tool Catalog, External Services
  Tool Catalog, Reliability Agent (the reasoning). See also
  `knowledge/reference/tool-fallbacks.md` for fallback chains and best-use-by-task
  guidance.
- **Claude Desktop/Code tool extensions by lane** (GitKraken, Supabase, Vercel,
  Google Drive, claude-in-chrome, Desktop Commander, Figma, Canva, Gmail, Zapier,
  etc.) — `docs/AGENT_TOOL_LANES.md` maps each to a lane (Build & Infra, Research &
  Files & Web, Design & Marketing, Comms & Automation) and includes a ready-to-paste
  Tool Use Contract for Claude Project instructions. Same rule as above: **connecting
  a tool personally does not automatically authorize agents to use it** — that still
  requires a real `docs/TOOL_CATALOG.md` classification plus the explicit contract in
  that doc.
