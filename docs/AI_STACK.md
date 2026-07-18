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

### Models

| Model | Provider | Tier |
|-------|----------|------|
| DeepSeek V-series | DeepSeek | Budget — routine tasks |
| GPT-5 mini | Azure OpenAI | Quality — important reasoning |
| Kimi 2.6 | Moonshot | Premium — long context only |

### Routing matrix

| Lane | low | medium | high |
|------|-----|--------|------|
| research | deepseek | deepseek | kimi |
| builder | deepseek | gpt5mini | gpt5mini |
| chief | deepseek | deepseek | gpt5mini |

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

```bash
# DeepSeek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Kimi (Moonshot)
KIMI_API_KEY=
KIMI_BASE_URL=https://api.moonshot.cn/v1

# Azure OpenAI (GPT-5 mini)
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
```
