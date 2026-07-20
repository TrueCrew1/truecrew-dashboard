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

Approved stack layers (premium / free / API / local / editor) and LLM usage policy:
[docs/TOOL_CATALOG.md](TOOL_CATALOG.md). Product runtime SoT:
`lib/ops/integrationsInventory.ts` (do not confuse with personal chat tools).

| Tool | Lane | Description | References |
|---|---|---|---|
| GitHub | EXECUTE-WITH-APPROVAL (merge/close) · READ-ONLY (browsing) | Source of truth, protected `main`, PR-based changes only | `AGENT_RUNBOOK.md` § Tool Catalog, `TOOL_CATALOG.md#github` |
| Claude Code | EXECUTE-WITH-APPROVAL | Git + scripted edits via PRs only, governed entirely by this runbook's existing gates | `AGENT_RUNBOOK.md` §§ Build Agent, Common Principles, `TOOL_CATALOG.md#claude-code` |
| Cursor Pro | PROPOSE-ONLY | Drafts diffs/PRs only; merge/close always routes through Build's normal gate regardless of authorship tool | `AGENT_RUNBOOK.md` § External Services Tool Catalog, `TOOL_CATALOG.md#cursor` |
| VS Code | launch shell (HUMAN) | Primary editor shell for Claude Code (Continue.dev secondary) | `TOOL_CATALOG.md#vscode` |
| Copilot | PAUSED | Do not reinstall by default; only if explicitly re-approved later | `TOOL_CATALOG.md#copilot`, `CLAUDE.md` § Tool routing |
| Supabase | EXECUTE-WITH-APPROVAL (migrations) · READ-ONLY (schema/status) | DB migrations via Build's existing schema/migration gate; console/billing stays human-only | `AGENT_RUNBOOK.md` § Tool Catalog, `TOOL_CATALOG.md#supabase`, integrations inventory |
| Vercel | READ-ONLY (deploy status/preview URLs) · EXECUTE-WITH-APPROVAL (deploys, via GitHub's PR-merge gate — not a direct Vercel write) | Env vars and production project config remain human-only | `AGENT_RUNBOOK.md` §§ Tool Catalog, External Services Tool Catalog, integrations inventory |
| Obsidian | READ/WRITE, no gate (Build Log / Agent Log) · PROPOSE-ONLY (roadmap/decision docs) | Chief's own logging is routine; a genuine roadmap/decision change still needs a `PlannerApprovalRequest` | `AGENT_RUNBOOK.md` § Tool Catalog (Docs & notes), `AGENT_WORKFLOW.md` |
| CodeRabbit | READ-ONLY | Automated PR review comments only — no write or merge access | `.coderabbit.yaml` |
| Ollama | PROPOSE-ONLY | Local model host under Open WebUI; optional Librarian | `TOOL_CATALOG.md#ollama-local` |
| Open WebUI | PROPOSE-ONLY (human local) | **Preferred** local day-to-day chat; **not** dashboard-runtime-wired | `TOOL_CATALOG.md#open-webui` |
| Continue.dev | PROPOSE-ONLY (secondary) | In-editor autocomplete fallback — not primary local chat | `TOOL_CATALOG.md#continue-dev` |
| Docker Desktop | HUMAN-ONLY (local infra) | Containers / MCP when needed locally — not a production deploy path | `TOOL_CATALOG.md#docker-desktop` |
| Azure LLM router (DeepSeek / Kimi / gpt-5-mini) | PROPOSE-ONLY (outputs) | **Default sustained** API work via `npm run llm` / Research / suggest-tests (Azure credits expire next month) | `docs/AI_STACK.md`, `TOOL_CATALOG.md#deepseek-api` |
| Claude Pro / free web LLMs | PROPOSE-ONLY (manual relay) | Premium judgment + free-filter overflow — no agent-callable consumer APIs today | `TOOL_CATALOG.md` Approved stack |
| Perplexity Pro | PROPOSE-ONLY (manual relay) | **PRIMARY research** lane for cited web / standards / competitive analysis | `TOOL_CATALOG.md` § Research tools |
| Grok (xAI) | PROPOSE-ONLY (human) / NON-PROD_WEB_AI | X/social sentiment only — not default research; no automated wiring without approval | `TOOL_CATALOG.md#grok-free` |
| Slack outbound (product) | product notify | Outbound webhook only — `partial` in integrations inventory | `lib/ops/integrationsInventory.ts` |
| Slack inbound/bot (personal) | future | Not built — `future-integration` in TOOL_CATALOG; do not conflate with outbound | `TOOL_CATALOG.md#slack` |
| Supabase migration PR check | READ-ONLY | CI check that lints/diffs migrations on PR against a non-production schema; never runs `supabase db push` | `.github/workflows/supabase-migration-pr-check.yml` |

**On Ollama / Open WebUI / Continue:** Open WebUI is the preferred local chat UI;
Continue.dev is secondary. Open WebUI is explicitly **not** a truecrew-dashboard
integration. Sustained/automated LLM work defaults to the **Azure router** while
credits remain.

**Keep in sync:** a lane change here should also update the reasoning table it derives
from (`AGENT_RUNBOOK.md`) and, if the tool's own classification changes, the row in
`docs/TOOL_CATALOG.md`. Product status changes also update
`lib/ops/integrationsInventory.ts` when the tool is product-scoped.
