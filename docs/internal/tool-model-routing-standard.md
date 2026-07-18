# Tool + Model Routing Standard

## Purpose

This file defines task → tool → model routing rules for cost-efficient, safe AI usage
across True Crew's dev workflow. It layers on top of
[docs/AGENT_TOOL_LANES.md](../AGENT_TOOL_LANES.md): the lanes file governs *which tool
may execute what* (READ-ONLY / PROPOSE-ONLY / EXECUTE-WITH-APPROVAL); this file governs
*which model, at what tier, should be asked first* for a given task. Escalating the
model tier never escalates the lane — see [docs/AGENT_RUNBOOK.md](../AGENT_RUNBOOK.md)
§ Tool lanes and AI routing for the combined policy statement.

## Model tiers

- **Tier 0 (no-LLM)** — grep, tests, lint, static analysis, repo search, docs lookup.
  No model call at all; always the first choice when the task is mechanical.
- **Tier 1 (local / cheap)** — Ollama coder models (e.g. `qwen2.5-coder`; exact size
  depends on the dev machine), GPT-5 mini, Kimi 2.6, DeepSeek free, etc. Default for
  routine, single-file, low-risk tasks.
- **Tier 2–3 (hosted / frontier)** — Claude Pro, Perplexity Pro, Cursor Pro, DeepSeek V
  Pro, etc. Reserved for architecture, auth/RLS, CI security, migrations, and
  cross-service reasoning.

## Coding model routing

**Use Ollama first for:**
- Single-file refactors, unit tests, code explanations.
- Drafting migration comments and PR bodies.

**Escalate to hosted Tier 2/3 only when:**
- Changes touch auth, RLS, CI security, production migrations, or multi-service
  architecture.
- Ollama output is ambiguous, fails tests/lint, or leaves spec unclear.

**Default Ollama config** (per `docs/TOOL_CATALOG.md#ollama-local` and `#continue-dev` —
already configured, not a proposal):
- Base endpoint: `http://localhost:11434/v1`
- Default coder model: `qwen2.5-coder` — autocomplete runs `qwen2.5-coder:7b`,
  chat/edit runs `qwen2.5-coder:14b` (size per dev machine; see Continue.dev config at
  `~/.continue/config.yaml`).
- A 2026-07-04 research note in `TOOL_CATALOG.md` flags Qwen3-Coder as benchmarking
  ahead of Qwen2.5-Coder at the same size — worth an eventual `ollama pull` evaluation,
  not an immediate change.

## Task routing examples

| Task | Primary tool | Default tier | Escalation trigger |
|---|---|---|---|
| Branch hygiene, PR cleanup | Claude Code | Tier 2 | Auth / migrations / CI changes |
| Code mapping / tracing | Cursor | Tier 1–2 | Cross-service refactor |
| Small refactor / TODOs | Copilot + Ollama | Tier 1 | Touches infra/auth/data model |
| SQL migration review | Claude Code + Ollama | Tier 2–3 | Destructive SQL / RLS / backfill |

**Note on the "Copilot" row above:** Copilot is not installed in this dev environment
(`docs/AGENT_TOOL_LANES.md` — REMOVED / N/A; `CLAUDE.md` § Tool routing). Read that row
as "Continue.dev + Ollama" in practice — the pairing is kept here because the
small-refactor/TODO task shape itself is real and worth routing explicitly, not because
Copilot is back in scope.
