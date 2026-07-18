# Agent Tool Lanes

This file is a matrix summary of the tool lanes defined in `docs/AGENT_RUNBOOK.md`
and `docs/AGENT_WORKFLOW.md` — it does not introduce new policy, only
summarizes it in one table. Three lane types: **READ-ONLY** (can inspect, never
writes), **PROPOSE-ONLY** (drafts a change for a human to apply/publish), and
**EXECUTE-WITH-APPROVAL** (can write directly, gated by a PR review or an
approval card).

| Tool | Lane | Description | References |
|---|---|---|---|
| GitHub | EXECUTE-WITH-APPROVAL | Source of truth, protected main, PR-based changes | `docs/AGENT_RUNBOOK.md` |
| Claude Code | EXECUTE-WITH-APPROVAL | Git + scripted edits via PRs only | `docs/AGENT_RUNBOOK.md`, `docs/TOOL_CATALOG.md` |
| Cursor | READ-ONLY / PROPOSE-ONLY | Mapping + refactors without git writes | `docs/AGENT_RUNBOOK.md` |
| Copilot | PROPOSE-ONLY | Inline suggestions in editor | `docs/AGENT_RUNBOOK.md` |
| Supabase | EXECUTE-WITH-APPROVAL | DB migrations via CI + manual workflows | `docs/AGENT_RUNBOOK.md`, `docs/AGENT_WORKFLOW.md` |
| Vercel | EXECUTE-WITH-APPROVAL | Deployments via PR merge + `workflow_dispatch` | `docs/AGENT_RUNBOOK.md` |
| Obsidian | READ-ONLY / PROPOSE-ONLY | Notes, research vault | `docs/AGENT_WORKFLOW.md` |
| CodeRabbit | READ-ONLY / PROPOSE-ONLY | PR review comments only | `.coderabbit.yaml` |
| Supabase migration PR check | READ-ONLY | Lints migrations on PR, no `db push` | `.github/workflows/supabase-migration-pr-check.yml` |
| Ollama (local) | READ-ONLY / PROPOSE-ONLY | Local-first default AI tier — editor autocomplete/chat, optional Librarian refinement; advisory/suggestion only, never a direct repo write | `docs/internal/tool-model-routing-standard.md` |

Descriptions here are intentionally short — see `docs/AGENT_RUNBOOK.md` for the
actual policy each lane enforces, and `docs/internal/tool-model-routing-standard.md`
for AI-model routing specifically (which tier is the default vs. opt-in
escalation).
