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
| VS Code | launch shell (HUMAN) | Primary editor shell for Claude Code + Continue.dev | `TOOL_CATALOG.md#vscode` |
| Copilot | PAUSED / OPTIONAL | Not required, not default — do not treat as core stack | `TOOL_CATALOG.md#copilot`, `CLAUDE.md` § Tool routing |
| Supabase | EXECUTE-WITH-APPROVAL (migrations) · READ-ONLY (schema/status) | DB migrations via Build's existing schema/migration gate; console/billing stays human-only | `AGENT_RUNBOOK.md` § Tool Catalog, `TOOL_CATALOG.md#supabase`, integrations inventory |
| Vercel | READ-ONLY (deploy status/preview URLs) · EXECUTE-WITH-APPROVAL (deploys, via GitHub's PR-merge gate — not a direct Vercel write) | Env vars and production project config remain human-only | `AGENT_RUNBOOK.md` §§ Tool Catalog, External Services Tool Catalog, integrations inventory |
| Obsidian | READ/WRITE, no gate (Build Log / Agent Log) · PROPOSE-ONLY (roadmap/decision docs) | Chief's own logging is routine; a genuine roadmap/decision change still needs a `PlannerApprovalRequest` | `AGENT_RUNBOOK.md` § Tool Catalog (Docs & notes), `AGENT_WORKFLOW.md` |
| CodeRabbit | READ-ONLY | Automated PR review comments only — no write or merge access | `.coderabbit.yaml` |
| Ollama | PROPOSE-ONLY | Local AI base layer — Continue.dev + optional Librarian; Tier 1 default in routing standard | `TOOL_CATALOG.md#ollama-local`, `docs/internal/tool-model-routing-standard.md` |
| Open WebUI | PROPOSE-ONLY (human local) | Local browser UI over Ollama; **not** dashboard-runtime-wired | `TOOL_CATALOG.md#open-webui` |
| Docker Desktop | HUMAN-ONLY (local infra) | Containers / MCP when needed locally — not a production deploy path | `TOOL_CATALOG.md#docker-desktop` |
| Azure LLM router (DeepSeek / Kimi / gpt-5-mini) | PROPOSE-ONLY (outputs) | Sustained API work via `npm run llm` / Research / suggest-tests | `docs/AI_STACK.md`, `TOOL_CATALOG.md#deepseek-api` |
| Claude Pro / Perplexity Pro / free web LLMs | PROPOSE-ONLY (manual relay) | Premium core + free-filter chats — no agent-callable consumer APIs today | `TOOL_CATALOG.md` Approved stack |
| Supabase migration PR check | READ-ONLY | CI check that lints/diffs migrations on PR against a non-production schema; never runs `supabase db push` | `.github/workflows/supabase-migration-pr-check.yml` |

**On Ollama / Open WebUI:** Local layer is for credit-free draft and filter. Open WebUI
is explicitly **not** claimed as a truecrew-dashboard integration. If Ollama becomes
callable from more product paths, update `TOOL_CATALOG.md` and the integrations
inventory in the same change.

**Keep in sync:** a lane change here should also update the reasoning table it derives
from (`AGENT_RUNBOOK.md`) and, if the tool's own classification changes, the row in
`docs/TOOL_CATALOG.md`. Product status changes also update
`lib/ops/integrationsInventory.ts` when the tool is product-scoped.
