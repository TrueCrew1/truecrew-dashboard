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
- approval_required: no
- notes: manual overflow/second-opinion chat, per `CLAUDE.md` tool routing.

### perplexity-pro
- name: Perplexity Pro
- category: ai
- owner_agent: Research
- access_type: launch-only
- interface: web
- launch_target: https://www.perplexity.ai
- model_type: Perplexity (web-search LLM)
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
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
- approval_required: no
- notes: large-context/multimodal tasks, per `CLAUDE.md` tool routing.

### deepseek-free
- name: free DeepSeek
- category: ai
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: not yet confirmed
- model_type: DeepSeek
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- approval_required: no
- notes: manual overflow chat when Claude credits are low, per `CLAUDE.md`.

### kimi-free
- name: free Kimi
- category: ai
- owner_agent: Research, Content
- access_type: launch-only
- interface: web
- launch_target: not yet confirmed
- model_type: Kimi
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- approval_required: no
- notes: manual overflow chat, per `CLAUDE.md`.

### ollama-local
- name: Ollama (local)
- category: ai
- owner_agent: — (David's own tooling, not a Chief-system agent)
- access_type: launch-only
- interface: cli / local
- launch_target: local machine
- model_type: local open models
- health_state: HEALTHY (default — Reliability reserved, not yet monitoring live)
- approval_required: no
- notes: powers Continue.dev autocomplete per `CLAUDE.md` — not wired to any
  Planner/Build/Research/Content/Chief workflow.

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
- approval_required: no
- notes: Continue.dev + Ollama autocomplete runs here, per `CLAUDE.md` — not part of
  the agent system.

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
- approval_required: n/a
- notes: interpersonal comms + inbox PII — too sensitive for even read access. See §
  External SaaS.
