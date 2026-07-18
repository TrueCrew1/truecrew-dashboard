# AI Stack

True Crew's AI tooling stack for Chief/Research/Builder lanes.

## Tools

| Tool | Role |
|------|------|
| **Perplexity Pro** | External web research → feeds `knowledge/` |
| **Cursor + Claude Code** | In-editor reasoning, multi-file refactors (use sparingly) |
| **GitHub Copilot** | Inline completion, quick test stubs |
| **LLM Router** | Structured text/code reasoning via `npm run llm` |

## LLM Router

Routes tasks to one of three external models based on lane + complexity.

### Models (Azure-backed)

| Logical model | Azure backend | Tier |
|---------------|---------------|------|
| DeepSeek-V3.2 | Azure AI Foundry | Budget — routine tasks |
| gpt-5-mini | Azure OpenAI deployment | Quality — important reasoning |
| Kimi-K2.6 | Azure AI Foundry | Long-context — Research high only |

### Routing matrix

| Lane | low | medium | high |
|------|-----|--------|------|
| research | DeepSeek-V3.2 | DeepSeek-V3.2 | Kimi-K2.6 |
| builder | DeepSeek-V3.2 | gpt-5-mini | gpt-5-mini |
| chief | DeepSeek-V3.2 | DeepSeek-V3.2 | gpt-5-mini |

### Defaults

- Token limits: low=400, medium=600, high=800
- Temperature: 0.4
- Timeout: 30s

## Task → Tool mapping

| Task | Tool | Lane + Complexity |
|------|------|-------------------|
| Research options | Perplexity + `llm` | research low/medium |
| Long synthesis | `llm` | research high → Kimi |
| Builder test ideas | `llm` | builder medium → GPT-5 mini |
| Chief wording | `llm` | chief low/medium → DeepSeek |
| Inline completion | Copilot | — |
| Multi-file refactor | Cursor + Claude Code | — |

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

**Budget target:** $200 / 30 days

1. **DeepSeek by default** — all low-complexity tasks
2. **GPT-5 mini for important reasoning** — Builder medium+, Chief high
3. **Kimi only for long context** — Research high when synthesizing many sources
4. **Short prompts** — include only necessary context
5. **Capped outputs** — 400–800 tokens based on complexity
6. **Reuse `knowledge/`** — don't repeat calls for the same research

## Environment variables

**Local CLI** (`npm run llm`): copy `.env.example` → `.env.local`. The CLI loads
`.env` then `.env.local` (override). Run `npm run llm -- --env-check` before smoke tests.

**Production** (`POST /api/llm/suggest-tests`): set the same three Azure variables in
Vercel → Project → Settings → Environment Variables (Production + Preview as needed).
Also requires `INTERNAL_API_SECRET` (and client `VITE_INTERNAL_KEY`) for the API auth gate.

| Variable | Required for | Consumed by |
|----------|--------------|-------------|
| `AZURE_OPENAI_API_KEY` | All LLM calls | `src/llm/azureClient.ts`, `src/llm/mistralClient.ts` |
| `AZURE_OPENAI_ENDPOINT` | gpt-5-mini routes | `src/llm/azureClient.ts` |
| `AZURE_AI_RESOURCE_ENDPOINT` | DeepSeek-V3.2, Kimi-K2.6 | `src/llm/mistralClient.ts` |
| `AZURE_OPENAI_DEPLOYMENT` | Not read by current router (deployment hardcoded `gpt-5-mini` in `router.ts`) | legacy `gpt5MiniClient.ts` only |

```bash
# .env.local (never commit — see .env.example)
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
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

The Vercel MCP server provides deployment and project management tools.

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
