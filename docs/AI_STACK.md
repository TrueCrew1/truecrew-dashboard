# AI Stack

True Crew's approved AI tooling — personal/editor/local layers plus the product LLM
router. Full catalog rows: [`docs/TOOL_CATALOG.md`](TOOL_CATALOG.md). Product runtime
integrations (Supabase, Vercel host, Slack webhook, etc.):
`lib/ops/integrationsInventory.ts` — **separate SoT**.

## Layers at a glance

| Layer | Tools | Role |
|-------|-------|------|
| **Premium core** | Claude Pro, Cursor Pro, Perplexity Pro | Primary quality judgment + coding + live web research |
| **Free / filter** | ChatGPT, Gemini, Grok, Kimi, DeepSeek (free web) | Overflow, second opinions, cheap filtering before Pro |
| **API / sustained** | DeepSeek, Kimi, gpt-5-mini via Azure router | Repeatable missions, CLI, Builder suggest-tests |
| **Local / self-hosted** | Ollama, Open WebUI, Docker Desktop (as needed) | Credit-free draft; **Open WebUI is not dashboard-wired** |
| **Editor / shell** | VS Code, Claude Code, Cursor | Primary implementation surfaces |
| **Paused / optional** | GitHub Copilot | Not required, not default |

## Premium core

| Tool | Role |
|------|------|
| **Claude Pro** | Hard reasoning, architecture, careful drafting (consumer chat) |
| **Cursor Pro** | Multi-file / agentic coding; propose-only for merge (Build gate) |
| **Perplexity Pro** | External web research → feeds `knowledge/` |

## Free / fallback / filter

Use before burning Pro credits: **ChatGPT free**, **Gemini free**, **Grok free**,
**Kimi free**, **DeepSeek free**. Manual only — not product APIs.

## API / sustained-work (LLM Router)

Routes tasks to Azure AI Foundry-backed logical models (`src/llm/router.ts`).

| Logical model | Azure backend | Tier |
|---------------|---------------|------|
| DeepSeek-V3.2 | Azure AI Foundry | Budget — routine tasks |
| gpt-5-mini | Azure AI Foundry | Quality — important reasoning |
| Kimi-K2.6 | Azure AI Foundry | Long-context — Research high only |

### Routing matrix

| Lane | low | medium | high |
|------|-----|--------|------|
| research | DeepSeek-V3.2 | DeepSeek-V3.2 | Kimi-K2.6 |
| builder | DeepSeek-V3.2 | gpt-5-mini | gpt-5-mini |
| chief | DeepSeek-V3.2 | DeepSeek-V3.2 | gpt-5-mini |

**Note:** `chief` lane is CLI / advisory (`npm run llm`) — there is no live Chief chat
loop in the dashboard UI. Research missions and Builder suggest-tests are the main
product callers.

### Defaults

- Token limits: low=400, medium=600, high=800
- Temperature: 0.4
- Timeout: 30s

## Local / self-hosted

| Tool | Role |
|------|------|
| **Ollama** | Local models; Continue.dev; optional Librarian refine when enabled |
| **Open WebUI** | Local browser UI over Ollama (and similar). Installed as local AI layer; **not** an app route or Vercel integration |
| **Docker Desktop** | When local containers / MCP infra need it |

## Editor / dev shell

| Tool | Role |
|------|------|
| **VS Code** | Primary shell |
| **Claude Code** | Governed agent runtime (PR-based) |
| **Cursor** | Editor + cloud agents (same premium-core Cursor Pro) |

**GitHub Copilot:** paused / optional — not part of the required stack. Prefer
Continue.dev + Ollama for inline assist.

## Task → tool mapping

| Task | Tool | Lane + Complexity |
|------|------|-------------------|
| Live web research | Perplexity Pro (+ optional free filter first) | — |
| Hard product/architecture call | Claude Pro | — |
| Multi-file refactor / agent PR | Cursor Pro + Claude Code | — |
| Routine local draft | Ollama / Open WebUI / Continue.dev | — |
| Research options (sustained) | `llm` router | research low/medium → DeepSeek |
| Long synthesis | `llm` | research high → Kimi |
| Builder test ideas | `llm` / suggest-tests | builder medium → gpt-5-mini |
| Chief wording (CLI) | `llm` | chief low/medium → DeepSeek |
| Inline completion | Continue.dev + Ollama (not Copilot) | — |

## LLM usage policy (summary)

Full policy: `docs/TOOL_CATALOG.md` § LLM usage policy.

1. Mechanical first (no LLM).
2. Local (Ollama / WebUI / Continue) for routine drafts.
3. Free filter before premium chat.
4. Premium core for judgment (Claude / Cursor / Perplexity Pro).
5. API router for sustained/automated work (preserve Pro credits).
6. Never lower the quality bar when choosing a cheaper lane — escalate when stuck.

## Usage

```bash
# Help / routing info
npm run llm -- --help
npm run llm -- --routing

# Research (default: DeepSeek)
npm run llm -- research low "List options for X"

# Research long-context (Kimi)
npm run llm -- research high "Synthesize these sources"

# Builder test ideas (GPT-5 mini)
npm run llm -- builder medium "Suggest tests for fn()"

# Chief wording (DeepSeek)
npm run llm -- chief low "Tighten these bullets"
```

## Cost discipline

**Budget target:** $200 / 30 days (API / Foundry)

1. **DeepSeek by default** — all low-complexity router tasks
2. **GPT-5 mini for important reasoning** — Builder medium+, Chief high
3. **Kimi only for long context** — Research high when synthesizing many sources
4. **Short prompts** — include only necessary context
5. **Capped outputs** — 400–800 tokens based on complexity
6. **Reuse `knowledge/`** — don't repeat calls for the same research
7. **Preserve Claude/Cursor/Perplexity Pro** — use free filter + local + API first

## Environment variables

**Local CLI** (`npm run llm`): copy `.env.example` → `.env.local`. The CLI loads
`.env` then `.env.local` (override). Run `npm run llm -- --env-check` before smoke tests.

**Production** (`POST /api/llm/suggest-tests`): set `AZURE_OPENAI_API_KEY` and
`AZURE_AI_RESOURCE_ENDPOINT` in Vercel → Project → Settings → Environment Variables
(Production + Preview as needed). Also requires `INTERNAL_API_SECRET` (and client
`VITE_INTERNAL_KEY`) for the API auth gate.

| Variable | Required for | Consumed by |
|----------|--------------|-------------|
| `AZURE_OPENAI_API_KEY` | All LLM calls | `src/llm/mistralClient.ts` (Foundry v1) |
| `AZURE_AI_RESOURCE_ENDPOINT` | All router models | `src/llm/mistralClient.ts` |
| `AZURE_OPENAI_ENDPOINT` | Not used by current router (legacy `azureClient.ts` only) | — |
| `AZURE_OPENAI_DEPLOYMENT` | Not read by current router | legacy `gpt5MiniClient.ts` only |

```bash
# .env.local (never commit — see .env.example)
AZURE_OPENAI_API_KEY=
# Foundry resource base — no /api/projects/... or /openai/v1 suffix
AZURE_AI_RESOURCE_ENDPOINT=https://YOUR_FOUNDRY_RESOURCE.services.ai.azure.com
```

Legacy `DEEPSEEK_*` / `KIMI_*` keys in `.env.example` are **not used** by the current router.

## Builder test-suggestion helper

On pending **Build** approval cards (Chief → Approvals), operators can click **Suggest tests**.

- Route: `builder` / `medium` → `gpt-5-mini` (via `api/llm/suggest-tests.ts` → `lib/llm` → router)
- Output is **advisory only** — does not approve, merge, or deploy
- Human must still use Approve / Send back / Reject
- API: `POST /api/llm/suggest-tests` (requires `x-internal-key` header matching `INTERNAL_API_SECRET`)

**Verify production (safe):**

```bash
# 1. Unauthenticated — expect 401
curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://YOUR_DOMAIN/api/llm/suggest-tests \
  -H "Content-Type: application/json" -d '{"title":"t","summary":"s"}'

# 2. Authenticated — expect 200 with suggestions, or 500 with Azure config error in body
curl -sS -X POST https://YOUR_DOMAIN/api/llm/suggest-tests \
  -H "Content-Type: application/json" \
  -H "x-internal-key: YOUR_INTERNAL_API_SECRET" \
  -d '{"title":"Docs-only change","summary":"README update for approval loop test"}'
```

## Vercel MCP

The Vercel MCP server provides deployment and project management tools (editor).

**Config** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}
```

**Auth required:** Must authenticate in Cursor Desktop before tools are available (`needsAuth` until login completes).

**Safety rules:**
- Read-only commands (list projects, view deployments) are preferred initially
- Deploy-capable commands require manual approval
- No automatic deploys from agent prompts
