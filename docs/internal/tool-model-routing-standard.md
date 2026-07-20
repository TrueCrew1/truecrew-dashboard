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
- **Tier 1 (API budget / free filter / local)** — **Azure-routed DeepSeek (default
  sustained lane)**, free web chats (ChatGPT / Gemini / Grok / Kimi / DeepSeek), and
  local Open WebUI (+ Ollama). Continue.dev is secondary in-editor assist only.
- **Tier 2–3 (premium core / API quality)** — Claude Pro, Cursor Pro, Perplexity Pro,
  Azure-routed gpt-5-mini and Kimi. Reserved for architecture, auth/RLS, CI security,
  migrations, cross-service reasoning, live web evidence, and long synthesis.

## Sustained-work default (Azure credits)

**Default sustained/automated LLM work to the Azure router** (`npm run llm`, Research
missions, suggest-tests). Azure credits expire next month — convert them into useful
work. Premium Pro tools are judgment/supervision; local/free are filter/fallback.

## Coding / chat routing

**Use Azure router first for:**
- Sustained Research/Builder LLM loops, CLI batches, suggest-tests, long sessions.

**Use Open WebUI (+ Ollama) for:**
- Preferred local day-to-day chat, offline draft, single-file explanations.

**Use Continue.dev only as:**
- Secondary/fallback in-editor autocomplete — not the primary local chat surface.

**Use free-filter web chats when:**
- You need a cheap second opinion before spending Pro credits.
- The question is exploratory and low-stakes.

**Escalate to premium core (Claude / Cursor / Perplexity Pro) when:**
- Changes touch auth, RLS, CI security, production migrations, or multi-service
  architecture.
- Azure/free/local output is ambiguous, fails tests/lint, or leaves spec unclear.
- Fresh web citations are required (Perplexity Pro).

**Default Ollama / Open WebUI** (per `docs/TOOL_CATALOG.md#ollama-local` /
`#open-webui`):
- Ollama base: `http://localhost:11434`
- Open WebUI fronts Ollama for preferred local chat — **not** wired into
  truecrew-dashboard.
- Continue.dev (if used): autocomplete `qwen2.5-coder:7b`, chat/edit
  `qwen2.5-coder:14b` at `~/.continue/config.yaml` — secondary only.

## Task routing examples

| Task | Primary tool | Default tier | Escalation trigger |
|---|---|---|---|
| Sustained Research mission | Azure DeepSeek / Kimi via router | Tier 1–2 | Mission blocked → human + Pro |
| Branch hygiene, PR cleanup | Claude Code | Tier 2 | Auth / migrations / CI changes |
| Code mapping / tracing | Cursor Pro | Tier 1–2 | Cross-service refactor |
| Small local chat / draft | Open WebUI (+ Ollama) | Tier 1 | Touches infra/auth/data model |
| In-editor autocomplete | Continue.dev (secondary) | Tier 1 | Prefer Open WebUI for chat |
| SQL migration review | Claude Code + Azure quality lane | Tier 2–3 | Destructive SQL / RLS / backfill |
| Live web research | Perplexity Pro (after optional free filter) | Tier 2–3 | Conflicting sources → Claude Pro |

**GitHub Copilot:** **paused.** Do not reinstall by default and do not route work
here. Optional only if David explicitly re-approves later
(`docs/TOOL_CATALOG.md#copilot`).
