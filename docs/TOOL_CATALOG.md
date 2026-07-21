# Tool Catalog

The single stable, appendable record of every tool in David's stack, for agent
governance and (eventually) a Tool Launcher / Quick Access board in the dashboard.
Reasoning behind each classification lives in `docs/AGENT_RUNBOOK.md` §§ Tool
Catalog / External Services Tool Catalog — this file is the machine-readable record
those sections classify *into*.

**Schema (fixed, one block per tool):**
- `id` — stable slug, never renamed once a UI or script references it
- `name` — human-readable name
- `category` — `ai` / `dev` / `ops`
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
  `removed` (deliberately excluded — see notes for why, so it reads as a decision,
  not an oversight).
- `approval_required` — `yes` / `no`, scoped per access_type if they differ
- `notes` — one line, cites the runbook section this classification reasons from

**To add a tool:** append a new `###` block at the end of its category. Never
hardcode a tool in UI logic — a future Tool Launcher reads this file, it doesn't
enumerate tools in code.

---

## AI

### claude-code
- name: Claude Code
- category: ai
- owner_agent: Chief (the agent runtime itself — all agents act through it)
- access_type: write
- interface: cli
- launch_target: this repo's terminal session
- model_type: Claude (Sonnet 5 / Opus 4.8 family)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: fully-wired
- approval_required: yes — governed entirely by this runbook's existing gates, not a
  new classification
- notes: not an external tool to launch; included for completeness since it's the
  thing running every other row's governance.

### claude-pro
- name: Claude Pro (claude.ai)
- category: ai
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://claude.ai
- model_type: Claude
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: consumer chat, separate from Claude Code — PROPOSE-ONLY in principle, no
  agent-callable API today. See § External Services Tool Catalog.

### chatgpt-free
- name: free ChatGPT
- category: ai
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://chatgpt.com
- model_type: GPT
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: manual overflow/second-opinion chat, per `CLAUDE.md` tool routing. Free-tier
  quota (researched 2026-07-04): roughly 10 messages per 5-hour rolling window on the
  current flagship model before falling back to a smaller model; no fixed daily cap,
  limit resets on a rolling basis. Fine for a quick second opinion, not for sustained
  drafting. Source: [OpenAI Help Center — ChatGPT Free Tier FAQ](https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq).

### perplexity-pro
- name: Perplexity Pro
- category: ai
- owner_agent: Research
- access_type: launch-only
- interface: web
- launch_target: https://www.perplexity.ai
- model_type: Perplexity (web-search LLM)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: live web/current-events research, per `CLAUDE.md` tool routing.

### gemini-free
- name: free Gemini
- category: ai
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://gemini.google.com
- model_type: Gemini
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: large-context/multimodal tasks, per `CLAUDE.md` tool routing. Free-tier quota
  (researched 2026-07-04): the consumer Gemini app is a separate contract from the
  Gemini API — Google AI Studio itself is free to browse with no subscription; a
  free API key (also from AI Studio) gets roughly 1,500 requests/day and up to 1M
  tokens/minute on Gemini 2.5 Flash (RPM 15; Flash-Lite RPM 30), while Gemini 2.5 Pro
  is capped much lower on free tier (~50 req/day) and Google moved Pro to paid-only
  API access as of April 2026. Rate limits are per-project, not per-key — extra keys
  don't add quota. Source: [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits),
  [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).

### deepseek-free
- name: free DeepSeek
- category: ai
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://chat.deepseek.com
- model_type: DeepSeek
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: manual overflow chat when Claude credits are low, per `CLAUDE.md`. Free-tier
  quota (researched 2026-07-04): the web/mobile chat interface (chat.deepseek.com) has
  no paid "Plus"/"Pro" tier for individuals — access to the current flagship model is
  free with daily-reset usage quotas, no fixed message cap published. The separate
  developer API grants new accounts 5M free tokens (~$8.40 value, expires in 30 days)
  and otherwise serves requests best-effort with no hard per-user RPM/TPM cap (occasional
  429/503 under peak load) — not needed for manual chat overflow use, only relevant if
  API access is ever wired in. Source: [DeepSeek API pricing](https://api-docs.deepseek.com/quick_start/pricing),
  [DeepSeek API rate limits](https://api-docs.deepseek.com/quick_start/rate_limit).

### kimi-free
- name: free Kimi
- category: ai
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: https://www.kimi.com
- model_type: Kimi (Moonshot AI)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: manual
- approval_required: no
- notes: manual overflow chat, per `CLAUDE.md`. Free-tier quota (researched
  2026-07-04): kimi.com's free "Adagio" plan gives unlimited basic chat, file upload
  (PDFs/images), and web access with no account required to try it; the current
  flagship model is free through the web UI. What's metered/not free: heavy agent
  tasks, deep-research mode, Agent Swarm, and Kimi Code — those draw down a separate
  quota or need a paid plan. The developer API (separate from the free web chat) caps
  at ~1,000 requests/day on the K2 base model, billed otherwise — not relevant unless
  API access is ever wired in. Source: [Moonshot AI platform](https://platform.moonshot.ai/),
  [Kimi AI pricing overview](https://kimik2ai.com/pricing/).

### ollama-local
- name: Ollama (local)
- category: ai
- owner_agent: — (David's own tooling, Continue.dev role); Chief (fallback role,
  see below) — two independent uses of the same local install
- access_type: launch-only (Continue.dev); read (Chief fallback — generates
  advisory text only)
- interface: cli / local
- launch_target: local machine
- model_type: local open models (`qwen2.5-coder` for Continue.dev; `llama3` /
  `deepseek-r1` for Chief, see `lib/ollama/client.ts`)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: launch-only (Continue.dev); partially-wired (Chief fallback)
- approval_required: no
- notes: **classification update** — this row previously stated Ollama was "not
  wired to any Planner/Build/Research/Content/Chief workflow." That's no longer
  true for Chief specifically: `lib/chief/modelRouter.ts` now calls local Ollama
  as the fallback tier below Azure (or the only tier in local-only mode), off by
  default (`CHIEF_OLLAMA_FALLBACK_ENABLED`), same no-match-only gate as
  `azure-ai-foundry` above. Only reachable when the serving process runs on the
  same machine as Ollama (local dev via `vercel dev` — not a deployed Vercel
  function), so this is a local-dev-only fallback tier, not a production one.
  The Continue.dev autocomplete role is unaffected and remains separate. See
  `docs/AGENT_RUNBOOK.md` § Chief AI Fallback Routing.
  Research note (2026-07-04, non-binding
  — no config change made): the currently-configured `qwen2.5-coder:7b`/`14b` (see
  `continue-dev` below) is still a solid, well-benchmarked choice, but Qwen3-Coder
  (community default now at 14B, Q4_K_M quantization, ~12GB VRAM) benchmarks ahead of
  Qwen2.5-Coder at the same size on repo-level coding tasks as of 2026. Worth an
  eventual `ollama pull` evaluation on David's own hardware before switching — not
  proposed as an immediate change. DeepSeek-Coder-V3 benchmarks highest of the three
  overall but needs ~140GB VRAM even at INT4 — not feasible on typical local hardware.
  Source: [best local coding LLM 2026 comparison](https://runlocalmodel.com/best-local-coding-llm-2026.html),
  [Qwen3-Coder-Next guide](https://dev.to/sienna/qwen3-coder-next-the-complete-2026-guide-to-running-powerful-ai-coding-agents-locally-1k95).

### continue-dev
- name: Continue.dev
- category: ai
- owner_agent: — (David's own editor tooling, not a Chief-system agent)
- access_type: launch-only (inline autocomplete + optional in-editor chat)
- interface: desktop-app (VS Code extension)
- launch_target: local — `continue.continue`, config at `~/.continue/config.yaml`
- model_type: local Ollama models (autocomplete `qwen2.5-coder:7b`, chat/edit
  `qwen2.5-coder:14b`, embeddings `nomic-embed-text`)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: launch-only
- approval_required: no
- notes: the decided, $0-cost editor-AI lane alongside Claude Code — see
  `CLAUDE.md` § Tool routing. Covers both autocomplete and cheap/routine chat in
  one extension; config already built, no further setup needed.

### azure-ai-foundry
- name: Azure AI Foundry (DeepSeek V4 Pro / GPT-5-mini / Kimi K2.6)
- category: ai
- owner_agent: Chief
- access_type: read (generates advisory text only — no write/execute capability)
- interface: api
- launch_target: `https://true-crew-resource.services.ai.azure.com` (project
  `true-crew`) — server-side only, never launched directly by a human or agent
- model_type: DeepSeek V4 Pro, GPT-5-mini, Kimi K2.6 (three deployments on one
  Azure AI Foundry resource, key-based auth)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: no — read-only text generation shown for the operator's own
  review, nothing executes; the feature flags that enable it at all
  (`CHIEF_AI_FALLBACK_ENABLED`, Vercel env vars) are HUMAN-ONLY to set, per Auth
  / infra below
- notes: distinct from the pre-existing `free-deepseek`/`kimi-free` rows above —
  those are David's manual web-chat overflow lanes (chat.deepseek.com,
  kimi.com), unrelated accounts/quotas from this API-based Azure deployment.
  Only ever called from `lib/chief/modelRouter.ts`, and only when
  `resolveChiefCommand` (`src/components/chief/chiefCommandRouter.ts`) finds no
  deterministic specialist match — a real match always wins and never reaches
  this tool. Off by default. See `docs/AGENT_RUNBOOK.md` § Chief AI Fallback
  Routing for the model-selection rules.

### gpt5-mini
- name: GPT-5 mini
- category: ai
- owner_agent: Chief (fallback tier)
- access_type: read (generates advisory text only — no write/execute capability)
- interface: api
- launch_target: shares the `azure-ai-foundry` resource above — server-side only,
  never launched directly by a human or agent
- model_type: GPT-5-mini (OpenAI model family, served via an Azure AI Foundry
  deployment — not a direct OpenAI account)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: no — same reasoning as `azure-ai-foundry`; read-only advisory
  text, nothing executes
- notes: one of three deployments on the single `azure-ai-foundry` resource — see
  that row for the shared access/approval reasoning. Routed to for
  general/unclassified fallback queries per `docs/AGENT_RUNBOOK.md` § Chief AI
  Fallback Routing. Env vars (`.env.example`): `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY`,
  `AZURE_AI_DEPLOYMENT_GPT5_MINI` (see `lib/azureAi/client.ts`). There is no
  separate `OPENAI_API_KEY` in this repo — this is an Azure-hosted deployment, not
  a direct OpenAI account.

### deepseek-v4-pro
- name: DeepSeek V4 Pro
- category: ai
- owner_agent: Chief (fallback tier)
- access_type: read (generates advisory text only — no write/execute capability)
- interface: api
- launch_target: shares the `azure-ai-foundry` resource above — server-side only
- model_type: DeepSeek V4 Pro (DeepSeek model family, served via an Azure AI
  Foundry deployment — not a direct DeepSeek account)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: no — same reasoning as `azure-ai-foundry`
- notes: one of three deployments on the single `azure-ai-foundry` resource.
  Routed to for reasoning/strategy/analysis fallback queries per
  `docs/AGENT_RUNBOOK.md` § Chief AI Fallback Routing. Env vars: `AZURE_AI_ENDPOINT`,
  `AZURE_AI_KEY`, `AZURE_AI_DEPLOYMENT_DEEPSEEK_V4_PRO`. Distinct from the
  `deepseek-free` row above (chat.deepseek.com manual overflow) — a different
  account and auth mechanism entirely. No separate `DEEPSEEK_API_KEY` or
  `DEEPSEEK_BASE_URL` exists in this repo.

### kimi-k2-6
- name: Kimi K2.6
- category: ai
- owner_agent: Chief (fallback tier)
- access_type: read (generates advisory text only — no write/execute capability)
- interface: api
- launch_target: shares the `azure-ai-foundry` resource above — server-side only
- model_type: Kimi K2.6 (Moonshot AI model family, served via an Azure AI Foundry
  deployment — not a direct Kimi/Moonshot account)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: no — same reasoning as `azure-ai-foundry`
- notes: one of three deployments on the single `azure-ai-foundry` resource.
  Routed to for code/refactor/long-context fallback queries per
  `docs/AGENT_RUNBOOK.md` § Chief AI Fallback Routing. Env vars: `AZURE_AI_ENDPOINT`,
  `AZURE_AI_KEY`, `AZURE_AI_DEPLOYMENT_KIMI_K2_6`. Distinct from the `kimi-free` row
  above (kimi.com manual overflow). No separate `KIMI_API_KEY` or `KIMI_BASE_URL`
  exists in this repo.

### chief-voice-v1
- name: Chief Voice v1 (browser Web Speech API)
- category: ai
- owner_agent: Chief
- access_type: read (speech-to-text input); write (text-to-speech "Speak" output)
  — both local to the browser, nothing sent to a server
- interface: web (native browser API — `SpeechRecognition`/`webkitSpeechRecognition`
  and `SpeechSynthesis`)
- launch_target: in-app — Chief panel push-to-talk button and the per-response
  "Speak" button, wherever Chief renders
- model_type: n/a — no LLM or external speech vendor; browser-native recognition/
  synthesis only
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: fully-wired
- approval_required: no
- notes: real and live today, entirely client-side
  (`src/components/chief/useChiefVoice.ts`); degrades gracefully to text-only when
  the browser doesn't support `SpeechRecognition` (`recognitionSupported` check).
  No env vars required. **Not the same as server-side voice**: `api/chief/transcribe.ts`
  and `api/chief/speak.ts` are placeholder routes that always return
  `501 Not Implemented` — a defined contract for a *future* server-side provider,
  vendor explicitly "not scoped/decided" per both files' own TODO comments. Do not
  treat those routes, or any transcription/TTS vendor env var, as wired — see
  `docs/AGENT_RUNBOOK.md` § Voice Prep (Scaffold Only).

## Continue.dev + Ollama (Lane 3)

Quick-reference config companion to the `continue-dev` catalog entry above.

- Role: local AI coding assistant for the `truecrew-dashboard` repo.
- Config file: `~/.continue/config.yaml` (not checked in, but recommended structure
  below).
- Recommended models (matches the locally installed config as of 2026-07-18):
  - Chat/edit: `qwen2.5-coder:14b` via Ollama.
  - Autocomplete: `qwen2.5-coder:1.5b-base` via Ollama.
  - Embeddings: `nomic-embed-text:latest` via Ollama (if used).

See `docs/internal/continue_config_example.md` for a sample config.

## Dev

### github
- name: GitHub (repo, PRs, issues)
- category: dev
- owner_agent: Build
- access_type: write (merge/close); read (browsing)
- interface: cli (`gh`) / web
- launch_target: https://github.com/TrueCrew1/truecrew-dashboard
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: fully-wired
- approval_required: yes (merge/close); no (browsing)
- notes: EXECUTE-WITH-APPROVAL for merge/close, READ-ONLY for browsing — already
  proven in practice. See § Tool Catalog.

### vercel
- name: Vercel
- category: dev
- owner_agent: Build (Reliability, reserved — future health/fallback monitoring)
- access_type: read (deploy status/preview URLs); write = human-only (env vars,
  production config)
- interface: web / mcp
- launch_target: https://vercel.com
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: no (read); n/a — human-only (config)
- notes: deploy-status read access already exercised for real this session. See §
  Tool Catalog, § Dashboards & analytics.

### supabase
- name: Supabase
- category: dev
- owner_agent: Build (Reliability, reserved)
- access_type: read (schema/status); write = propose-only (migrations, via code)
- interface: web / api
- launch_target: https://supabase.com/dashboard
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes (migrations — Build's existing "database or schema
  migration" gate); no (read)
- notes: console/dashboard (billing, service keys) stays human-only.

### sentry
- name: Sentry
- category: dev
- owner_agent: Build, Research (Reliability, reserved)
- access_type: read
- interface: web
- launch_target: not yet confirmed — not yet connected
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: future-integration
- approval_required: no
- notes: new, low-risk, pairs with Daily Build Health Check for real incident
  correlation — not yet in active use.

### cursor
- name: Cursor / VS Cursor
- category: dev
- owner_agent: Build
- access_type: write (drafts diffs/PRs only)
- interface: desktop-app
- launch_target: local
- model_type: n/a (multi-model editor)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: partially-wired
- approval_required: yes — merge/close always goes through Build's normal gate
  regardless of authorship tool
- notes: real evidenced use in this repo's history (`cursor/*` branches).

### vscode
- name: VS Code
- category: dev
- owner_agent: — (David's own editor)
- access_type: launch-only
- interface: desktop-app
- launch_target: local
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: launch-only
- approval_required: no
- notes: Continue.dev + Ollama autocomplete runs here, per `CLAUDE.md` — not part of
  the agent system.

### copilot
- name: GitHub Copilot (+ Copilot Chat)
- category: dev
- owner_agent: — (human-only)
- access_type: n/a
- interface: desktop-app (VS Code extension) / web
- launch_target: n/a — not installed
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: removed
- approval_required: n/a
- notes: explicitly excluded per `CLAUDE.md` (global): "only if already surfaced
  inside Office/Windows tools; not wired into this dev environment." Copilot Chat's
  cache/storage was cleaned up 2026-07-03 after an earlier uninstall. Not a gap —
  listed here so the exclusion reads as a decision, not an oversight. Free-tier facts
  (researched 2026-07-04, documented for reference only — **this does not reopen the
  removed decision above**): GitHub's free individual plan gives 2,000 code
  completions/month and 50 Copilot Chat messages/month, auto model selection only, no
  credit card required. Recorded here in case it's useful context later; not a
  reinstall proposal. Source: [GitHub Copilot plans](https://docs.github.com/en/copilot/get-started/plans),
  [Copilot usage limits](https://docs.github.com/en/copilot/concepts/usage-limits).

### cline
- name: Cline (`saoudrizwan.claude-dev`)
- category: dev
- owner_agent: — (human-only)
- access_type: n/a
- interface: desktop-app (VS Code extension)
- launch_target: n/a — not installed
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: removed
- approval_required: n/a
- notes: deliberately uninstalled 2026-07-03 — duplicated Claude Code's agentic
  role. Task-history data (9 sessions, free OpenRouter model) left on disk on
  purpose; only the extension was removed. Don't suggest reinstalling as "another
  option" — see `CLAUDE.md` § Tool routing.

### cline-nightly
- name: Cline Nightly (`saoudrizwan.cline-nightly`)
- category: dev
- owner_agent: — (human-only)
- access_type: n/a
- interface: desktop-app (VS Code extension)
- launch_target: n/a — not installed
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: removed
- approval_required: n/a
- notes: a second, never-really-used duplicate install of Cline running alongside
  stable — pure accumulation, removed in the same 2026-07-03 pass. Same "don't
  reinstall" guidance as `cline`.

## Ops / workflow

### obsidian-buildlog
- name: Obsidian — Build Log / Agent Log
- category: ops
- owner_agent: Chief
- access_type: write
- interface: filesystem (vault)
- launch_target: local vault
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: fully-wired
- approval_required: no
- notes: logging is Chief's own responsibility, no gate — proven every session.

### obsidian-roadmap
- name: Obsidian — roadmap/decision docs
- category: ops
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
- owner_agent: — (human-only)
- access_type: launch-only
- interface: web / desktop-app
- launch_target: not yet confirmed
- model_type: n/a
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- status: future-integration
- approval_required: n/a
- notes: no confirmed agent use case yet — least-privilege default per Global
  Standard, same treatment as Zapier/ticketing in § External SaaS.

### calendar
- name: Calendar
- category: ops
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
