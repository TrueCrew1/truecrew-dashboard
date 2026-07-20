# Tool + Model Routing Standard

## Purpose

This file defines task → tool → model routing rules for cost-efficient, safe AI usage
across True Crew's dev workflow. It layers on top of
[docs/AGENT_TOOL_LANES.md](../AGENT_TOOL_LANES.md): the lanes file governs *which tool
may execute what* (READ-ONLY / PROPOSE-ONLY / EXECUTE-WITH-APPROVAL); this file governs
*which model, at what tier, should be asked first* for a given task. Escalating the
model tier never escalates the lane — see [docs/AGENT_RUNBOOK.md](../AGENT_RUNBOOK.md)
§ Tool lanes and AI routing for the combined policy statement.

Approved stack layers and the full LLM usage policy live in
[docs/TOOL_CATALOG.md](../TOOL_CATALOG.md) and [docs/AI_STACK.md](../AI_STACK.md).
Product runtime integrations remain in `lib/ops/integrationsInventory.ts` — separate.

## Model tiers

- **Tier 0 (no-LLM)** — grep, tests, lint, static analysis, repo search, docs lookup.
  No model call at all; always the first choice when the task is mechanical.
- **Tier 1 (local / free filter / API budget)** — Ollama (+ Open WebUI / Continue.dev),
  free web chats (ChatGPT / Gemini / Grok / Kimi / DeepSeek), and Azure-routed
  DeepSeek for sustained API work. Default for routine, single-file, low-risk tasks.
- **Tier 2–3 (premium core / API quality)** — Claude Pro, Cursor Pro, Perplexity Pro,
  Azure-routed gpt-5-mini and Kimi. Reserved for architecture, auth/RLS, CI security,
  migrations, cross-service reasoning, live web evidence, and long synthesis.

## Coding model routing

**Use Ollama / Open WebUI / Continue.dev first for:**
- Single-file refactors, unit tests, code explanations.
- Drafting migration comments and PR bodies.

**Use free-filter web chats when:**
- You need a cheap second opinion before spending Pro credits.
- The question is exploratory and low-stakes.

**Use API router (`npm run llm` / Research / suggest-tests) when:**
- Work is sustained, repeatable, or automated — preserve Pro chat quotas.

**Escalate to premium core (Claude / Cursor / Perplexity Pro) when:**
- Changes touch auth, RLS, CI security, production migrations, or multi-service
  architecture.
- Local/free/API-budget output is ambiguous, fails tests/lint, or leaves spec unclear.
- Fresh web citations are required (Perplexity Pro).

**Default Ollama config** (per `docs/TOOL_CATALOG.md#ollama-local` and `#continue-dev` —
already configured, not a proposal):
- Base endpoint: `http://localhost:11434/v1`
- Default coder model: `qwen2.5-coder` — autocomplete runs `qwen2.5-coder:7b`,
  chat/edit runs `qwen2.5-coder:14b` (size per dev machine; see Continue.dev config at
  `~/.continue/config.yaml`).
- Open WebUI (when running) typically fronts the same Ollama host — local browser UI
  only; **not** wired into truecrew-dashboard.
- A 2026-07-04 research note in `TOOL_CATALOG.md` flags Qwen3-Coder as benchmarking
  ahead of Qwen2.5-Coder at the same size — worth an eventual `ollama pull` evaluation,
  not an immediate change.

## Task routing examples

| Task | Primary tool | Default tier | Escalation trigger |
|---|---|---|---|
| Branch hygiene, PR cleanup | Claude Code | Tier 2 | Auth / migrations / CI changes |
| Code mapping / tracing | Cursor Pro | Tier 1–2 | Cross-service refactor |
| Small refactor / TODOs | Continue.dev + Ollama (or Open WebUI) | Tier 1 | Touches infra/auth/data model |
| SQL migration review | Claude Code + Ollama | Tier 2–3 | Destructive SQL / RLS / backfill |
| Live web research | Perplexity Pro (after optional free filter) | Tier 2–3 | Conflicting sources → Claude Pro |
| Sustained Research mission | Azure DeepSeek / Kimi via router | Tier 1–2 | Mission blocked → human + Pro |

**GitHub Copilot:** paused / optional — not required. Do not route default work to
Copilot; use Continue.dev + Ollama or Cursor / Claude Code instead
(`docs/TOOL_CATALOG.md#copilot`).
