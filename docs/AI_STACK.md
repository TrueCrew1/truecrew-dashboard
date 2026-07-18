# AI Stack

True Crew's AI tooling stack for the Chief/Research/Builder lanes.

## Tools in the stack

| Tool | Role | When to use |
|------|------|-------------|
| **GitHub Copilot** | Inline completion + quick tests | Tab-completion while coding, quick test stubs |
| **Cursor Pro + Claude Code** | Repo-wide reasoning and refactors | Large refactors, multi-file changes, architecture decisions (use sparingly) |
| **Perplexity Pro** | External research | Feeding `knowledge/` with external sources, market research, tech comparisons |
| **Claude Pro (web)** | Big-picture governance | Deep thinking, strategic decisions, governance reviews |
| **LLM Router** | Structured text and code reasoning | CLI-driven tasks for Research v1, Builder v1, Chief |

## LLM Router

The LLM router (`src/llm/router.ts`) routes tasks to one of three external models based on **lane** and **complexity**:

### Models

| Model | Provider | Tier | Use case |
|-------|----------|------|----------|
| DeepSeek V-series | DeepSeek | Budget | Cheap, routine tasks |
| GPT-5 mini | Azure OpenAI | Quality | Important reasoning, careful decisions |
| Kimi 2.6 | Moonshot | Premium | Long-context synthesis only |

### Routing matrix

| Lane | Low | Medium | High |
|------|-----|--------|------|
| research | deepseek | deepseek | kimi |
| builder | deepseek | gpt5mini | gpt5mini |
| chief | deepseek | deepseek | gpt5mini |

### Token limits

| Complexity | Max tokens |
|------------|------------|
| low | 400 |
| medium | 600 |
| high | 800 |

Default temperature: 0.4  
Default timeout: 30s

## Usage

```bash
# Research v1 — cheap exploration
npm run llm -- research low "List three options for X with pros/cons"

# Research v1 — long-context synthesis (Kimi)
npm run llm -- research high "Synthesize these 5 sources into a recommendation"

# Builder v1 — test ideas
npm run llm -- builder medium "Suggest edge-case tests for stableChiefId()"

# Chief — governance wording
npm run llm -- chief low "Tighten these bullets: <paste>"

# Chief — important decision review
npm run llm -- chief high "Review this ADR for risks: <paste>"
```

## If X, then Y — task routing

| Task | Tool | Lane |
|------|------|------|
| Inline code completion | Copilot | — |
| Quick test stub | Copilot | — |
| Multi-file refactor | Cursor + Claude Code | — |
| External research | Perplexity Pro | knowledge/ |
| Strategic decision | Claude Pro (web) | — |
| List options for a problem | LLM Router | research low |
| Synthesize multiple sources | LLM Router | research high |
| Test ideas for a function | LLM Router | builder medium |
| Quick analysis of change impact | LLM Router | builder low |
| Refine doc bullets | LLM Router | chief low |
| Decision risk review | LLM Router | chief high |

## Cost discipline

**Budget target:** $200 / 30 days Azure + external APIs

### Rules

1. **DeepSeek by default** — all low-complexity tasks, routine Research and Chief work
2. **GPT-5 mini for important reasoning** — Builder medium+, Chief high-complexity, decisions
3. **Kimi 2.6 only for long context** — Research high-complexity when synthesizing many sources
4. **Short prompts** — include only necessary context
5. **Capped outputs** — 400–800 tokens based on complexity
6. **Reuse `knowledge/`** — don't repeat LLM calls for the same research; file results

### Cost estimates

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| DeepSeek | ~$0.001/1K | ~$0.002/1K | Very cheap |
| GPT-5 mini | ~$0.01/1K | ~$0.03/1K | Use for quality |
| Kimi 2.6 | ~$0.01/1K | ~$0.02/1K | Long context only |

At typical usage (10–20 LLM calls/day, mostly DeepSeek), monthly cost should be well under $50.

## Environment variables

```bash
# DeepSeek
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Kimi (Moonshot)
KIMI_API_KEY=your-key
KIMI_BASE_URL=https://api.moonshot.cn/v1

# Azure OpenAI (GPT-5 mini)
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
```

## Integration with lanes

### Research v1

1. Run `npm run llm -- research <complexity> "<question>"`
2. Curate the output
3. File into `knowledge/sources/<topic>-research.md` using the Research template
4. Respect the "Will I care in 3–6 months?" filter

### Builder v1

1. Use `npm run llm -- builder <complexity> "<task>"` for:
   - Test ideas
   - Impact analysis
   - Code suggestions
2. Actual code changes still go through Builder governance and PR/approval

### Chief

1. Use `npm run llm -- chief <complexity> "<task>"` for:
   - Refining bullets in `docs/AGENT_RUNBOOK.md`
   - Summarizing Research results
   - Decision review
2. Chief's authority and decision rules stay unchanged
