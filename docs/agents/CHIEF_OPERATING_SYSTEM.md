# Chief Operating System — AI tool stack

Short operating brief for Chief-adjacent sessions. Full catalog:
[`docs/TOOL_CATALOG.md`](../TOOL_CATALOG.md). Product agents/integrations:
`lib/ops/toolGovernanceCatalog.ts` / `lib/ops/integrationsInventory.ts`.

## Separation of concerns

| Domain | Source of truth | Examples |
|--------|-----------------|----------|
| Personal / editor / local AI | `docs/TOOL_CATALOG.md` | Claude Pro, Cursor, Ollama, Open WebUI |
| Product runtime | `lib/ops/integrationsInventory.ts` | Supabase, Vercel host, Slack webhook, Azure router |
| Product agents | `lib/ops/toolGovernanceCatalog.ts` | Chief, Research, Builder, Librarian, Monitor |

Do **not** claim Open WebUI, free web chats, or Copilot are wired into the dashboard
unless the product inventory says so.

## Approved AI stack (Chief should steer toward)

1. **Premium core** — Claude Pro, Cursor Pro, Perplexity Pro  
2. **Free / filter** — ChatGPT, Gemini, Grok, Kimi, DeepSeek (free web)  
3. **API / sustained** — DeepSeek / Kimi / gpt-5-mini via Azure router (`docs/AI_STACK.md`)  
4. **Local** — Ollama, Open WebUI, Docker Desktop when needed  
5. **Editor shell** — VS Code + Claude Code + Cursor  
6. **Paused** — GitHub Copilot (optional; not required)

## Routing policy (Chief checklist)

| Situation | Prefer |
|-----------|--------|
| Grep / lint / known doc answer | No LLM |
| Routine draft / single-file | Ollama / Open WebUI / Continue.dev |
| Cheap second opinion | Free-filter web chat |
| Live web evidence | Perplexity Pro |
| Hard judgment / architecture | Claude Pro |
| Multi-file implementation | Cursor Pro + Claude Code (PR + Build gate) |
| Sustained Research / suggest-tests | API router (preserve Pro credits) |
| Merge / migrate / deploy | Existing Chief → Build gates — never “because the model said so” |

## Credit preservation

- Filter and local first; Pro last for judgment.  
- API router for loops/missions.  
- Reuse `knowledge/` — do not re-research what is already logged.  
- Cheaper lane does not mean lower bar — escalate when quality fails.

## What Chief is *not*

- A live dashboard LLM chat powered by Claude Pro or Open WebUI.  
- An automatic deployer or inbound Slack “Scout” agent.  

Chief remains the **approval and command layer**; Research/Builder own product LLM
calls today.
