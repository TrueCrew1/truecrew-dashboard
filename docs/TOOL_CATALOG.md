# Tool Catalog

The single stable, appendable record of every tool in David's **personal / editor /
local AI stack**, for agent governance and (eventually) a Tool Launcher board.

**Product/runtime integrations** (Supabase, Vercel hosting, Slack webhook, Azure
router used by Research/Builder APIs, etc.) live separately in:

- `lib/ops/integrationsInventory.ts` + `docs/internal/integrations-inventory.md`
- `lib/ops/toolGovernanceCatalog.ts` + `docs/internal/tool-governance-catalog.md`

Do **not** treat a row here as product-wired into `truecrew-dashboard` unless that
integration inventory (or proven code) says so.

Reasoning behind lane classifications: `docs/AGENT_RUNBOOK.md` §§ Tool Catalog /
External Services Tool Catalog. Fast lane lookup: `docs/AGENT_TOOL_LANES.md`.
Model-tier routing: `docs/internal/tool-model-routing-standard.md`.
Operating summary: `docs/AI_STACK.md`, `docs/agents/CHIEF_OPERATING_SYSTEM.md`.

**Schema (fixed, one block per tool):**
- `id` — stable slug, never renamed once a UI or script references it
- `name` — human-readable name
- `category` — `ai` / `dev` / `ops`
- `stack_layer` — `premium-core` / `free-filter` / `api-sustained` / `local-self-hosted` /
  `editor-shell` / `ops-workflow` / `paused` (see Approved stack below)
- `owner_agent` — which agent(s) use it (`—` if none / human-only)
- `access_type` — `launch-only` / `read` / `write` (mixed tools list both, scoped)
- `interface` — how it's reached (`web`, `cli`, `api`, `mcp`, `desktop-app`,
  `filesystem`, `in-app`)
- `launch_target` — URL or launch point; `not yet confirmed` if unverified rather than
  guessed
- `model_type` — underlying model family for AI tools; `n/a` otherwise
- `health_state` — `HEALTHY` / `DEGRADED` / `BLOCKED` / `PROBING`, per
  `docs/AGENT_RUNBOOK.md` § Reliability Agent. Defaults to `HEALTHY` for every tool —
  Reliability is still reserved and not actively monitoring; this field is where it
  will write real state once activated. See `knowledge/reference/tool-fallbacks.md`
  for the ~10 critical tools' fallback chains.
- `status` — how real the integration actually is, never overstated:
  `fully-wired` (an agent uses it directly, automatically, as part of normal
  operation) / `partially-wired` (real, working access, but scoped — read-only, or
  propose-only) / `launch-only` (can be opened, no read/write integration) /
  `manual` (output only reaches an agent via David relaying it by hand) /
  `future-integration` (not connected yet, or no confirmed use case) /
  `paused` (optional; not required/default — may be re-enabled later) /
  `removed` (deliberately excluded — see notes for why, so it reads as a decision,
  not an oversight).
- `approval_required` — `yes` / `no`, scoped per access_type if they differ
- `notes` — one line, cites the runbook section this classification reasons from

**To add a tool:** append a new `###` block at the end of its category. Never
hardcode a tool in UI logic — a future Tool Launcher reads this file, it doesn't
enumerate tools in code.

---

## Approved stack (layers)

### Premium core (primary quality)

| Tool | Catalog id | Best use |
|------|------------|----------|
| Claude Pro | `claude-pro` | Hard reasoning, architecture, ambiguous product decisions, high-stakes drafting |
| Cursor Pro | `cursor` | Multi-file repo edits, PR drafts, cloud/agent coding in this repo |
| Perplexity Pro | `perplexity-pro` | Live web / current-events research with citations |

### Free / fallback / filter

| Tool | Catalog id | Best use |
|------|------------|----------|
| ChatGPT free | `chatgpt-free` | Quick second opinion; overflow when premium credits are tight |
| Gemini free | `gemini-free` | Large-context / multimodal skim |
| Grok free | `grok-free` | Alternate filter/second opinion |
| Kimi free | `kimi-free` | Overflow chat; light research when API not needed |
| DeepSeek free | `deepseek-free` | Overflow chat; cheap filter before escalating |

### API / sustained-work (product + CLI router) — **default sustained lane**

Logical models routed via Azure AI Foundry in this repo (`docs/AI_STACK.md`,
`src/llm/router.ts`). **Default for repeatable, automated, or long sessions** —
convert Azure credits (expire next month) into useful work rather than sitting idle.
Premium chat/editor tools stay for judgment and supervision, not bulk loops.

| Logical model | Catalog id | Role |
|---------------|------------|------|
| DeepSeek (API / Foundry) | `deepseek-api` | Budget sustained work — Research/Builder low/medium default |
| Kimi (API / Foundry) | `kimi-api` | Long-context Research high |
| gpt-5-mini (API / Foundry) | `gpt-5-mini-api` | Quality Builder medium+ / Chief high wording via CLI |

### Local / self-hosted

| Tool | Catalog id | Best use |
|------|------------|----------|
| Ollama | `ollama-local` | Local model host under Open WebUI (+ optional Librarian refine) |
| WebUI / Open WebUI | `open-webui` | **Preferred** local day-to-day chat UI over Ollama; **not** dashboard runtime |
| Docker Desktop | `docker-desktop` | Local infra / MCP containers when needed |
| Continue.dev | `continue-dev` | Secondary/fallback in-editor autocomplete/chat — not the primary local chat surface |

### Editor / dev shell

| Tool | Catalog id | Best use |
|------|------------|----------|
| VS Code | `vscode` | Primary editor shell |
| Claude Code (in VS Code / CLI) | `claude-code` | Governed agent runtime for PR-based repo work |
| Cursor | `cursor` | Same as Cursor Pro row — propose-only diffs/PRs |

### Paused / optional (not required)

| Tool | Catalog id | Notes |
|------|------------|-------|
| GitHub Copilot (+ Chat) | `copilot` | **Paused** — do **not** reinstall by default. Optional only if David explicitly re-approves later. |

### Runtime / product (separate SoT)

Use `lib/ops/integrationsInventory.ts` for: Supabase, Vercel hosting/probe, Slack
**outbound webhook only** (`partial`), GitHub webhook, Azure OpenAI (product), Obsidian
vault path, internal API auth, Vercel MCP (editor), Google Drive (`not_wired`).

**Slack split (intentional):** product inventory = outbound webhook (`partial`); this
personal catalog row = inbound/bot/agent command workflow (`future-integration`). Do
not merge those statuses. Do not duplicate product statuses here as if they were
personal chat tools.

---

## Tool routing policy (concise)

| Tool | Category | Status | Best use | Avoid use for | Preferred owner/agent | Notes |
|------|----------|--------|----------|---------------|----------------------|-------|
| Claude Pro | premium-core | manual | Hard decisions, architecture, quality drafting | Bulk/routine loops; burning credits on greppable tasks | Research, Content, Chief (human) | Consumer chat — not product-wired |
| Cursor Pro | premium-core / editor-shell | partially-wired | Multi-file edits, cloud agents, PR drafts | Merging/deploying without Build gate | Build | Evidenced via `cursor/*` branches |
| Perplexity Pro | premium-core | manual | Live web research + citations | Code execution; treating notes as approved truth | Research | Relay findings into `knowledge/` |
| ChatGPT free | free-filter | manual | Second opinion / overflow | Sustained drafting past free window | Research, Content | Filter before escalating to Pro |
| Gemini free | free-filter | manual | Large context / multimodal skim | Authoritative product decisions alone | Research, Content | Separate from Gemini API quotas |
| Grok free | free-filter | manual | Alternate filter opinion | Sole source for ship decisions | Research, Content | Manual web chat |
| Kimi free | free-filter | manual | Overflow chat | Sustained API-scale workloads | Research, Content | Prefer `kimi-api` for sustained |
| DeepSeek free | free-filter | manual | Overflow / cheap filter | Long automated missions | Research, Content | Prefer `deepseek-api` for sustained |
| DeepSeek API | api-sustained | partially-wired | **Default sustained** budget lane | Burning Pro chat on bulk loops | Research, Builder (router) | Azure credits expire next month — prefer this lane |
| Kimi API | api-sustained | partially-wired | Long-context Research high | Tiny greppable questions | Research (router) | Via Azure Foundry |
| gpt-5-mini API | api-sustained | partially-wired | Builder suggest-tests; quality reasoning | Every trivial edit | Builder, Chief CLI | Via Azure Foundry |
| Ollama | local-self-hosted | launch-only / partial product | Local model host | Production Vercel without vault/host | — / Librarian when enabled | Backs Open WebUI |
| Open WebUI | local-self-hosted | launch-only | **Preferred** local day-to-day chat | Claiming dashboard integration | — (human) | **Not** wired into truecrew-dashboard |
| Continue.dev | editor-shell | launch-only | Secondary in-editor autocomplete/chat | Primary local chat (use Open WebUI) | — | Fallback to Open WebUI |
| Docker Desktop | local-self-hosted | launch-only | Local containers / MCP infra | Production deploy path | — (human) | Use when local infra needs it |
| VS Code | editor-shell | launch-only | Primary shell for Claude Code | Replacing PR/approval gates | — | |
| Claude Code | editor-shell | fully-wired | Governed repo agent work | Skipping Chief/Build gates | Chief runtime / Build | Runbook-governed |
| Copilot | paused | paused | — (do not use unless re-approved) | Default stack; autonomous reinstall | — | Paused — no reinstall by default |
| Slack (personal inbound) | ops-workflow | future-integration | Future bot/inbound workflow | Treating outbound webhook as “full Slack” | — | See product inventory for outbound |
| GitHub / Vercel / Supabase | product (see inventory) | see inventory | Repo, host, DB | Confusing with chat subscriptions | Build | Product SoT ≠ this catalog |

---

## LLM usage policy (credit preservation)

1. **Start mechanical.** Grep, tests, lint, docs lookup — Tier 0, no model.
2. **Azure/API first for sustained work.** Default repeatable, automated, or long
   sessions to the Azure router (DeepSeek → gpt-5-mini → Kimi via `npm run llm`,
   Research missions, suggest-tests). **Reason:** Azure credits expire next month —
   convert them into useful work. See `docs/AI_STACK.md`.
3. **Free filter before premium chat.** Use ChatGPT / Gemini / Grok / Kimi / DeepSeek
   **free** web chats to narrow options or get a second opinion; escalate only when
   stuck or stakes rise.
4. **Local filter / offline draft.** Prefer **Open WebUI** (over Ollama) for local
   day-to-day chat. Continue.dev is secondary/fallback for in-editor autocomplete —
   not the primary local chat surface.
5. **Premium core for judgment and supervision** (not bulk loops):
   - **Claude Pro** — ambiguous product/architecture calls, careful prose, conflict
     resolution between sources.
   - **Cursor Pro** — multi-file implementation and agentic coding in this repo
     (still propose-only for merge; Build gate applies).
   - **Perplexity Pro** — anything that needs fresh web evidence.
6. **Do not burn Pro credits on:** formatting, repeating research already in
   `knowledge/`, or tasks the Azure router / free filter / local model already solved.
7. **Quality bar stays fixed.** Cheaper lane ≠ lower acceptance criteria — escalate
   tier when output is ambiguous, fails tests, or touches auth/RLS/migrations/CI.
8. **Copilot stays paused.** Do not reinstall or route work to Copilot unless David
   explicitly re-approves it later.

---

## AI

### claude-code
- name: Claude Code
- category: ai
- stack_layer: editor-shell
- owner_agent: Chief (the agent runtime itself — all agents act through it)
- access_type: write
- interface: cli
- launch_target: this repo's terminal session (often inside VS Code)
- model_type: Claude (Sonnet / Opus family)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: fully-wired
- approval_required: yes — governed entirely by this runbook's existing gates, not a
  new classification
- notes: not an external tool to launch; included for completeness since it's the
  thing running every other row's governance. Primary agent runtime alongside Cursor.

### claude-pro
- name: Claude Pro (claude.ai)
- category: ai
- stack_layer: premium-core
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://claude.ai
- model_type: Claude
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: premium-core consumer chat, separate from Claude Code — PROPOSE-ONLY in
  principle, no agent-callable Anthropic API in this stack today. Use for hard
  reasoning; preserve credits via free-filter + API router first.

### chatgpt-free
- name: free ChatGPT
- category: ai
- stack_layer: free-filter
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://chatgpt.com
- model_type: GPT
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: free-filter / second-opinion chat. Free-tier quota (researched 2026-07-04):
  roughly 10 messages per 5-hour rolling window on the current flagship model before
  falling back to a smaller model; no fixed daily cap, limit resets on a rolling
  basis. Fine for a quick second opinion, not for sustained drafting. Source:
  [OpenAI Help Center — ChatGPT Free Tier FAQ](https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq).

### perplexity-pro
- name: Perplexity Pro
- category: ai
- stack_layer: premium-core
- owner_agent: Research
- access_type: launch-only
- interface: web
- launch_target: https://www.perplexity.ai
- model_type: Perplexity (web-search LLM)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: premium-core live web/current-events research. Relay useful findings into
  `knowledge/` — do not treat chat output as merged product truth.

### gemini-free
- name: free Gemini
- category: ai
- stack_layer: free-filter
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://gemini.google.com
- model_type: Gemini
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: free-filter large-context/multimodal tasks. Free-tier quota (researched
  2026-07-04): the consumer Gemini app is a separate contract from the Gemini API —
  Google AI Studio itself is free to browse with no subscription; a free API key
  (also from AI Studio) gets roughly 1,500 requests/day and up to 1M tokens/minute on
  Gemini 2.5 Flash (RPM 15; Flash-Lite RPM 30), while Gemini 2.5 Pro is capped much
  lower on free tier (~50 req/day) and Google moved Pro to paid-only API access as of
  April 2026. Rate limits are per-project, not per-key — extra keys don't add quota.
  Source: [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits),
  [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).

### grok-free
- name: Grok (xAI) — free web
- category: ai
- stack_layer: free-filter
- owner_agent: Research, Content (human relay only)
- access_type: launch-only
- interface: web
- launch_target: https://grok.com
- model_type: Grok (xAI)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no (chat); **yes** for any future xAI API / product wiring
- notes: Lane **NON-PROD_WEB_AI** — personal / low-sensitivity research only. Rules:
  no MSHA-sensitive or customer-identifiable data; no production or bulk workloads;
  no xAI API integration without explicit governance approval. Not product-wired and
  not part of the Azure LLM router. Company site (not the chat entry): https://x.ai/.
  Confirmed entry URL 2026-07-20: `url_main` https://grok.com.

### deepseek-free
- name: free DeepSeek
- category: ai
- stack_layer: free-filter
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://chat.deepseek.com
- model_type: DeepSeek
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: free-filter overflow chat. For sustained/automated work use `deepseek-api`
  (Azure router) instead. Free web chat has daily-reset usage quotas; developer API
  is a separate contract. Source: [DeepSeek API pricing](https://api-docs.deepseek.com/quick_start/pricing),
  [DeepSeek API rate limits](https://api-docs.deepseek.com/quick_start/rate_limit).

### kimi-free
- name: free Kimi
- category: ai
- stack_layer: free-filter
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://www.kimi.com
- model_type: Kimi (Moonshot AI)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: free-filter overflow chat. For sustained long-context missions use `kimi-api`
  (Azure router). Free "Adagio" plan facts researched 2026-07-04 — heavy agent /
  deep-research modes may be metered. Source: [Moonshot AI platform](https://platform.moonshot.ai/).

### deepseek-api
- name: DeepSeek API (Azure Foundry — router budget lane)
- category: ai
- stack_layer: api-sustained
- owner_agent: Research, Builder
- access_type: write (server/CLI only — structured LLM tasks)
- interface: api
- launch_target: `npm run llm` / Research mission runners / Azure Foundry
- model_type: DeepSeek-V3.2 (logical)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes for any action derived from output that hits an existing gate
- notes: Product/CLI sustained-work lane via `src/llm/router.ts`. Requires
  `AZURE_OPENAI_API_KEY` + `AZURE_AI_RESOURCE_ENDPOINT`. Legacy direct `DEEPSEEK_*`
  keys in `.env.example` are unused by the current router.

### kimi-api
- name: Kimi API (Azure Foundry — long-context Research)
- category: ai
- stack_layer: api-sustained
- owner_agent: Research
- access_type: write (server/CLI only)
- interface: api
- launch_target: `npm run llm -- research high …` / Research missions
- model_type: Kimi-K2.6 (logical)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes for gate-hit actions from output
- notes: Prefer for long synthesis over burning Claude Pro or free web chat.
  Same Azure env as other router models. Legacy `KIMI_*` keys unused by current router.

### gpt-5-mini-api
- name: gpt-5-mini API (Azure Foundry — quality lane)
- category: ai
- stack_layer: api-sustained
- owner_agent: Builder, Chief (CLI wording only)
- access_type: write (server/CLI only)
- interface: api
- launch_target: `POST /api/llm/suggest-tests`, `npm run llm`
- model_type: gpt-5-mini (logical)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes — suggest-tests output is advisory only; Build gate still applies
- notes: Builder medium/high and Chief high CLI wording. Not a live Chief chat loop in
  the dashboard UI.

### ollama-local
- name: Ollama (local)
- category: ai
- stack_layer: local-self-hosted
- owner_agent: — (David's own tooling; optional Librarian refine when enabled)
- access_type: launch-only (editor); partial product when `LIBRARIAN_AI_ENABLED`
- interface: cli / local
- launch_target: local machine (`http://127.0.0.1:11434`)
- model_type: local open models
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: launch-only
- approval_required: no
- notes: Local model host behind **Open WebUI** (preferred chat UI) and optional
  Librarian refinement / Continue.dev fallback. Not a substitute for Azure-router
  sustained work or governed Research missions on Vercel. Research note (2026-07-04,
  non-binding): `qwen2.5-coder:7b`/`14b` still solid; Qwen3-Coder worth eventual
  evaluation — not an immediate change.

### open-webui
- name: WebUI / Open WebUI (local)
- category: ai
- stack_layer: local-self-hosted
- owner_agent: — (human local tooling)
- access_type: launch-only
- interface: web (local) / docker
- launch_target: local Open WebUI instance (typically over Ollama)
- model_type: whatever models Ollama (or configured backends) expose
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: launch-only
- approval_required: no
- notes: **Preferred local day-to-day chat surface.** Installed as part of the local
  AI layer; **not wired into truecrew-dashboard runtime** (no app route, env, or API
  integration in this repo). Use for local filter/offline draft; promote useful
  outcomes into PRs/`knowledge/` manually. Sustained/automated work still prefers
  the Azure router while credits remain.

### continue-dev
- name: Continue.dev
- category: ai
- stack_layer: editor-shell
- owner_agent: — (David's own editor tooling, not a Chief-system agent)
- access_type: launch-only (inline autocomplete + optional in-editor chat)
- interface: desktop-app (VS Code extension)
- launch_target: local — `continue.continue`, config at `~/.continue/config.yaml`
- model_type: local Ollama models (autocomplete `qwen2.5-coder:7b`, chat/edit
  `qwen2.5-coder:14b`, embeddings `nomic-embed-text`)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: launch-only
- approval_required: no
- notes: **Secondary / fallback** in-editor assist — available, but Open WebUI is the
  preferred local chat UI. Do not describe Continue as the primary local AI surface.

## Dev

### github
- name: GitHub (repo, PRs, issues)
- category: dev
- stack_layer: ops-workflow
- owner_agent: Build
- access_type: write (merge/close); read (browsing)
- interface: cli (`gh`) / web
- launch_target: https://github.com/TrueCrew1/truecrew-dashboard
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: fully-wired
- approval_required: yes (merge/close); no (browsing)
- notes: EXECUTE-WITH-APPROVAL for merge/close, READ-ONLY for browsing — already
  proven in practice. Product webhook/CI details also in integrations inventory.

### vercel
- name: Vercel
- category: dev
- stack_layer: ops-workflow
- owner_agent: Build (Reliability, reserved — future health/fallback monitoring)
- access_type: read (deploy status/preview URLs); write = human-only (env vars,
  production config)
- interface: web / mcp
- launch_target: https://vercel.com
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: no (read); n/a — human-only (config)
- notes: Personal-stack classification for deploy visibility. Runtime probe/hosting
  status of truth: `lib/ops/integrationsInventory.ts` id `vercel`.
- **known noise (decided, issue #89):** `INTERNAL_API_SECRET` is intentionally not
  set in Vercel's Preview environment scope (Production only). Preview deployments
  will show `requireInternalAuth` 401s on every internal `/api/*` call — this is
  expected, not an incident. See `knowledge/decisions/vercel-preview-secret-scope.md`.

### supabase
- name: Supabase
- category: dev
- stack_layer: ops-workflow
- owner_agent: Build (Reliability, reserved)
- access_type: read (schema/status); write = propose-only (migrations, via code)
- interface: web / api
- launch_target: https://supabase.com/dashboard
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes (migrations — Build's existing "database or schema
  migration" gate); no (read)
- notes: console/dashboard (billing, service keys) stays human-only. Product SoT:
  integrations inventory id `supabase`.

### sentry
- name: Sentry
- category: dev
- stack_layer: ops-workflow
- owner_agent: Build, Research (Reliability, reserved)
- access_type: read
- interface: web
- launch_target: not yet confirmed — not yet connected
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: future-integration
- approval_required: no
- notes: not product-wired — do not claim live error tracking in the dashboard.

### cursor
- name: Cursor Pro / Cursor
- category: dev
- stack_layer: premium-core
- owner_agent: Build
- access_type: write (drafts diffs/PRs only)
- interface: desktop-app
- launch_target: local
- model_type: n/a (multi-model editor)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes — merge/close always goes through Build's normal gate
  regardless of authorship tool
- notes: Premium-core editor + cloud agents. Real evidenced use (`cursor/*` branches).
  Propose-only for merge; not a bypass of Chief/Build gates.

### vscode
- name: VS Code
- category: dev
- stack_layer: editor-shell
- owner_agent: — (David's own editor)
- access_type: launch-only
- interface: desktop-app
- launch_target: local
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: launch-only
- approval_required: no
- notes: Primary editor shell — Claude Code (+ Continue.dev as secondary inline
  assist). Copilot stays paused — do not reinstall unless explicitly re-approved.
  Not part of the agent approval system itself.

### docker-desktop
- name: Docker Desktop
- category: dev
- stack_layer: local-self-hosted
- owner_agent: — (human local infra)
- access_type: launch-only
- interface: desktop-app
- launch_target: local
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: launch-only
- approval_required: no
- notes: Use when local infra or MCP containers need it (e.g. Open WebUI). Not a
  production deploy tool and not wired into the dashboard app.

### copilot
- name: GitHub Copilot (+ Copilot Chat)
- category: dev
- stack_layer: paused
- owner_agent: — (human-only, optional)
- access_type: n/a
- interface: desktop-app (VS Code extension) / web
- launch_target: n/a — not part of the required/default stack
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: paused
- approval_required: n/a
- notes: **Paused.** Do **not** reinstall by default and do **not** route work here.
  Optional **only** if David explicitly re-approves later — agents must not treat
  this row as permission to turn Copilot back on. Use Claude Code / Cursor Pro /
  Open WebUI / Azure router instead. Free-tier facts (researched 2026-07-04) are
  reference-only. Source:
  [GitHub Copilot plans](https://docs.github.com/en/copilot/get-started/plans).

### cline
- name: Cline (`saoudrizwan.claude-dev`)
- category: dev
- stack_layer: paused
- owner_agent: — (human-only)
- access_type: n/a
- interface: desktop-app (VS Code extension)
- launch_target: n/a — not installed
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: removed
- approval_required: n/a
- notes: deliberately uninstalled 2026-07-03 — duplicated Claude Code's agentic
  role. Don't suggest reinstalling as "another option" — see `CLAUDE.md` § Tool
  routing.

### cline-nightly
- name: Cline Nightly (`saoudrizwan.cline-nightly`)
- category: dev
- stack_layer: paused
- owner_agent: — (human-only)
- access_type: n/a
- interface: desktop-app (VS Code extension)
- launch_target: n/a — not installed
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: removed
- approval_required: n/a
- notes: never-really-used duplicate of Cline — removed 2026-07-03. Same "don't
  reinstall" guidance as `cline`.

## Ops / workflow

### obsidian-buildlog
- name: Obsidian — Build Log / Agent Log
- category: ops
- stack_layer: ops-workflow
- owner_agent: Chief
- access_type: write
- interface: filesystem (vault)
- launch_target: local vault
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: fully-wired
- approval_required: no
- notes: logging is Chief's own responsibility, no gate — proven every session.
  Product vault env: `OBSIDIAN_VAULT_PATH` (not available on Vercel production).

### obsidian-roadmap
- name: Obsidian — roadmap/decision docs
- category: ops
- stack_layer: ops-workflow
- owner_agent: Planner, Chief
- access_type: write (propose-only for a new decision; direct edit only to sync an
  already-established fact)
- interface: filesystem (vault)
- launch_target: local vault
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes (a genuine change — `PlannerApprovalRequest`); no (routine
  sync)
- notes: see the Weekly Planner Pass precedent in the Build Log.

### repo-docs
- name: Repo docs (`docs/*.md`, `README.md`)
- category: ops
- stack_layer: ops-workflow
- owner_agent: Content, Build
- access_type: write (propose-only via PR)
- interface: filesystem (repo)
- launch_target: this repo
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes (external-facing docs — single-issue card); no (internal)
- notes: Content's "external copy — no surprises" rule applies to anything
  public-facing, including a public README.

### dashboard-tasks
- name: Dashboard Tasks (internal)
- category: ops
- stack_layer: ops-workflow
- owner_agent: Build, Chief
- access_type: write
- interface: in-app
- launch_target: this app
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: fully-wired
- approval_required: governed by the dashboard's own existing stage-gate logic, not
  a new tool-catalog gate
- notes: not an external tool — the product's own domain. Included because "tasks"
  was named as an Ops/workflow tool family; no new governance introduced here.

### slack
- name: Slack
- category: ops
- stack_layer: ops-workflow
- owner_agent: — (human-only for inbound; product has outbound webhook)
- access_type: launch-only (personal); see product inventory for outbound notify
- interface: web / desktop-app
- launch_target: not yet confirmed
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: future-integration
- approval_required: n/a
- notes: **Intentional split — do not conflate.** This personal-catalog row =
  inbound / bot / agent-command Slack workflow → `future-integration` (not built).
  Product/runtime inventory id `slack` = **outbound webhook only** → `partial`
  (`SLACK_WEBHOOK_URL`, governed-loop notify). Outbound ≠ full Slack integration.

### calendar
- name: Calendar
- category: ops
- stack_layer: ops-workflow
- owner_agent: — (human-only)
- access_type: launch-only
- interface: web / app
- launch_target: not yet confirmed
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: future-integration
- approval_required: n/a
- notes: scheduling mistakes are highly visible and affect other people's time — see
  § External SaaS.

### email
- name: Email (Gmail)
- category: ops
- stack_layer: ops-workflow
- owner_agent: — (human-only)
- access_type: launch-only
- interface: web
- launch_target: https://mail.google.com
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: future-integration
- approval_required: n/a
- notes: interpersonal comms + inbox PII — too sensitive for even read access. See §
  External SaaS.
