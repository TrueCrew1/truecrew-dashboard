# Chief Operating System — AI tool stack

Short operating brief for Chief-adjacent sessions. Full catalog:
[`docs/TOOL_CATALOG.md`](../TOOL_CATALOG.md). Product agents/integrations:
`lib/ops/toolGovernanceCatalog.ts` / `lib/ops/integrationsInventory.ts`.

## Separation of concerns

| Domain | Source of truth | Examples |
|--------|-----------------|----------|
| Personal / editor / local AI | `docs/TOOL_CATALOG.md` | Claude Pro, Cursor, Open WebUI, Ollama |
| Product runtime | `lib/ops/integrationsInventory.ts` | Supabase, Vercel host, Slack **outbound webhook**, Azure router |
| Product agents | `lib/ops/toolGovernanceCatalog.ts` | Chief, Research, Builder, Librarian, Monitor |

**Slack split (intentional):** product inventory = outbound webhook only (`partial`);
personal catalog = inbound/bot/agent commands (`future-integration`). Do not conflate.

Do **not** claim Open WebUI, free web chats, or Copilot are wired into the dashboard
unless the product inventory says so.

## Approved AI stack (Chief should steer toward)

1. **API / sustained (default bulk)** — DeepSeek / Kimi / gpt-5-mini via Azure router
   (`docs/AI_STACK.md`) — use while Azure credits remain (expire next month)
2. **Premium core** — Claude Pro, Cursor Pro; **Perplexity Pro = PRIMARY research**
3. **Free / filter** — ChatGPT, Gemini, Kimi, DeepSeek (overflow); **Grok** =
   NON-PROD_WEB_AI for X/social sentiment only (not default research)
4. **Local** — **Open WebUI** (preferred chat) over Ollama; Continue.dev secondary;
   Docker Desktop when needed
5. **Editor shell** — VS Code + Claude Code + Cursor
6. **Paused** — GitHub Copilot (do not reinstall by default; only if explicitly
   re-approved later)

## Routing policy (Chief checklist)

| Situation | Prefer |
|-----------|--------|
| Grep / lint / known doc answer | No LLM |
| Sustained / automated LLM work | **Azure router** (default) |
| Cheap second opinion | Free-filter web chat |
| Local day-to-day chat | **Open WebUI** (+ Ollama) |
| In-editor autocomplete only | Continue.dev (secondary) |
| Live web / standards / competitive research | **Perplexity Pro (PRIMARY)** |
| X/social sentiment only | Grok (NON-PROD_WEB_AI) — never as default research |
| Hard judgment / architecture | Claude Pro |
| Multi-file implementation | Cursor Pro + Claude Code (PR + Build gate) |
| Merge / migrate / deploy | Existing Chief → Build gates — never “because the model said so” |

## Credit preservation

- Azure router first for bulk/sustained work (credits expire next month).  
- Free filter + Open WebUI for local/cheap passes.  
- Pro tools last for judgment — not bulk loops.  
- Reuse `knowledge/` — do not re-research what is already logged.  
- Cheaper lane does not mean lower bar — escalate when quality fails.  
- Copilot stays paused — agents must not treat “paused” as “turn it back on.”

## What Chief is *not*

- A live dashboard LLM chat powered by Claude Pro or Open WebUI.  
- An automatic deployer or inbound Slack “Scout” / bot agent.  

Chief remains the **approval and command layer**; Research/Builder own product LLM
calls today (Azure router).
