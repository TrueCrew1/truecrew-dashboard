# Documentation

Index for True Crew repo docs. Start at the root [README](../README.md) for stack and
quick start; use [EXECUTION_KIT.md](EXECUTION_KIT.md) at the start of each agent session.

## Setup and deploy

| Doc | Purpose |
|---|---|
| [DEPLOY_NOW.md](DEPLOY_NOW.md) | Fast production deploy checklist |
| [VERCEL_SUPABASE_SETUP.md](VERCEL_SUPABASE_SETUP.md) | Full Vercel + Supabase setup |
| [OBSERVABILITY.md](OBSERVABILITY.md) | PostHog + Sentry external setup and verification |

## Agent workflow

| Doc | Purpose |
|---|---|
| [EXECUTION_KIT.md](EXECUTION_KIT.md) | Session kickoff, lanes, copy-paste prompts |
| [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) | Agent ↔ approver roles and PR process |
| [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) | Agent laws and Chief foreman model |
| [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md) | Build/Research approval technical reference |
| [AGENT_RUNTIME_GOVERNANCE.md](AGENT_RUNTIME_GOVERNANCE.md) | Runtime guardrails and decision logging |
| [PR_SUMMARY_TEMPLATE.md](PR_SUMMARY_TEMPLATE.md) | PR description template |
| [OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md) | Post-merge vault logging |

## Features

| Doc | Purpose |
|---|---|
| [PLANNER_WORK_ITEMS.md](PLANNER_WORK_ITEMS.md) | Planner work items schema, routes, curl examples |

## Decisions

Architecture Decision Records (ADRs) — durable *why* notes for structural choices.
See the [decisions index](decisions/README.md) for convention and full list.

| ADR | Topic |
|---|---|
| [ADR-001 — Auditor system](decisions/ADR-001-auditor-system.md) | Observability-only audit layer |
| [ADR-002 — V1 auth trust boundary](decisions/ADR-002-auth-trust-boundary.md) | Phased v1 auth; memberships authoritative, ops tables backend-only |

## Architecture

_System diagrams, data models, and cross-cutting design notes will live here._
Nothing committed yet — see `decisions/` for recorded choices in the meantime.
