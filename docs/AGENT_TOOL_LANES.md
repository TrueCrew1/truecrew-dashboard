# Agent Tool Lanes

This file is a single-table matrix summary of the tool lane classifications reasoned
through in [docs/AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) §§ Tool Catalog and External
Services Tool Catalog, plus the routing rules in [docs/AGENT_WORKFLOW.md](AGENT_WORKFLOW.md)
— check here first for a fast "what lane is tool X in" lookup, and read those sections
for the reasoning behind a given row. Lane types, defined in full in `AGENT_RUNBOOK.md`
§ Tool Catalog:

- **READ-ONLY** — agent may look, never change.
- **PROPOSE-ONLY** — agent may draft a change; a human executes it even after approval.
- **EXECUTE-WITH-APPROVAL** — agent may execute the change itself, but only after a
  cleared `ApprovalCard`.

## Agent × authority (summary)

Full MUST / MUST NOT / MUST escalate text: [AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) agent
sections + Chief Decision Rubric. Decision law:
[SYSTEM_LAW_TRUTH_MERGE_DECISION_TABLE_V1.md](SYSTEM_LAW_TRUTH_MERGE_DECISION_TABLE_V1.md).

| Lane | Authority (short) | Must not |
|---|---|---|
| **Planner / Orchestrator** | Scope + sequence; vault-aware plans | Code, migrations, merge, Truth Map invention |
| **Standards Review** (role, not new agent) | Pre-Chief Truth Map / evidence check on PRs | Approve merges; rewrite product scope |
| **Build** (Cursor propose · Claude Code execute) | Commits/PRs; real QA; blast radius | Unilateral System Law edits; external publish; Discovery-as-merge |
| **Discovery / Research** | Investigate; typed notes in `knowledge/sources/` | Ship code; treat hypotheses as policy; `knowledge/discovery/` tree |
| **Content & Media** | Draft copy/UX text | Code, migrations, gates, merges |
| **Chief** | Cards + Decision Rubric against System Law / Truth Map | Auto-merge, auto-deploy, invent law |

GitHub Copilot (when present for tiny local edits only) is **excluded from governance /
law decisions** — it must not edit System Law, Truth Map, or the Decision Rubric.

## Tool lanes

| Tool | Lane | Description | References |
|---|---|---|---|
| GitHub | EXECUTE-WITH-APPROVAL (merge/close) · READ-ONLY (browsing) | Source of truth, protected `main`, PR-based changes only | `AGENT_RUNBOOK.md` § Tool Catalog, `TOOL_CATALOG.md#github` |
| Claude Code | EXECUTE-WITH-APPROVAL | Git + scripted edits via PRs only, governed entirely by this runbook's existing gates | `AGENT_RUNBOOK.md` §§ Build Agent, Common Principles, `TOOL_CATALOG.md#claude-code` |
| Cursor | PROPOSE-ONLY | Drafts diffs/PRs only; merge/close always routes through Build's normal gate regardless of authorship tool | `AGENT_RUNBOOK.md` § External Services Tool Catalog, `TOOL_CATALOG.md#cursor` |
| Copilot | REMOVED / N/A (paused); tiny local only if explicitly re-enabled — **never governance/law** | Explicitly excluded from this repo's law decisions | `CLAUDE.md` § Tool routing, `TOOL_CATALOG.md#copilot` |
| Supabase | EXECUTE-WITH-APPROVAL (migrations) · READ-ONLY (schema/status) | DB migrations via Build's existing schema/migration gate; console/billing stays human-only | `AGENT_RUNBOOK.md` § Tool Catalog, `TOOL_CATALOG.md#supabase` |
| Vercel | READ-ONLY (deploy status/preview URLs) · EXECUTE-WITH-APPROVAL (deploys, via GitHub's PR-merge gate — not a direct Vercel write) | Env vars and production project config remain human-only | `AGENT_RUNBOOK.md` §§ Tool Catalog, External Services Tool Catalog, `TOOL_CATALOG.md#vercel` |
| Obsidian | READ/WRITE, no gate (Build Log / Agent Log) · PROPOSE-ONLY (roadmap/decision docs) | Chief's own logging is routine; a genuine roadmap/decision change still needs a `PlannerApprovalRequest` | `AGENT_RUNBOOK.md` § Tool Catalog (Docs & notes), `AGENT_WORKFLOW.md` |
| CodeRabbit | READ-ONLY | Automated PR review comments only — no write or merge access | `.coderabbit.yaml` (newly cataloged in this PR — not previously classified in `AGENT_RUNBOOK.md`) |
| Ollama | PROPOSE-ONLY | Local AI OS base layer for coding & reasoning — the default Tier 1 target in `docs/internal/tool-model-routing-standard.md`; today realized only through Continue.dev's human-reviewed inline suggestions, not yet a Chief-system agent-callable tool | `TOOL_CATALOG.md#ollama-local`, `docs/internal/tool-model-routing-standard.md` |
| Supabase migration PR check | READ-ONLY | CI check that lints/diffs migrations on PR against a non-production schema; never runs `supabase db push` | `.github/workflows/supabase-migration-pr-check.yml` |

**On Ollama's lane:** `TOOL_CATALOG.md`'s existing `ollama-local` row still shows
`owner_agent: —` and `status: launch-only` — accurate today, since Ollama isn't wired
into any Planner/Build/Research/Content/Chief workflow yet. This file formalizes the
*intended* routing role without changing that access reality.
If Ollama ever becomes agent-callable (not just Continue.dev's editor autocomplete),
update `TOOL_CATALOG.md#ollama-local`'s `status`/`owner_agent` fields in a follow-up PR,
per this runbook's own Change Control.

**Keep in sync:** a lane change here should also update the reasoning table it derives
from (`AGENT_RUNBOOK.md`) and, if the tool's own classification changes, the row in
`docs/TOOL_CATALOG.md`.
