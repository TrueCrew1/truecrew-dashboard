---
title: Tool Fallback Chains
type: reference
status: active
confidence: medium
last_reviewed: 2026-07-04
related_pages: [tool-catalog, chief-approvals]
related_prs: []
---

# Tool Fallback Chains

Fallback routing for the tools most critical to day-to-day agent work — what to use
next when the primary is `DEGRADED`/`BLOCKED`, and when to go back. Governance only:
no automation here decides anything on its own — an agent (or, once activated,
Reliability) reads this table and a human/agent still makes the call per
`docs/AGENT_RUNBOOK.md` § Reliability Agent's existing gates.

**Scope note:** the task that requested this named several tools (PostHog, Resend,
Inngest, Drizzle, Zod, Figma, Stripe, QuickBooks, Google Workspace, OneDrive) that
aren't in `docs/TOOL_CATALOG.md` and have no confirmed use in this repo or
`CLAUDE.md`'s tool routing. Building fallback chains for them would be governing
tools that don't exist yet — intentionally left out; see "Gaps" at the bottom
instead of a fabricated entry.

**Health state** for each tool below lives on its block in `docs/TOOL_CATALOG.md`
(`health_state` field, added this pass) — this page is the routing logic, that file
is the live (currently all-default) state.

## Credit-low mode — quick playbook

A short decision tree for "Claude/Perplexity credits are constrained right now" —
synthesized from the Tiers and Best-use tables below, plus the researched free-tier
facts in the table under "free-tier AI overflow chain." Real quota numbers, not
guesses — see `docs/TOOL_CATALOG.md` for the researched source per tool
(researched 2026-07-04).

| If... | Do this |
|---|---|
| Claude Code itself is `BLOCKED` | No fallback — this is a real outage, not a routing decision (see `claude-code` below). All agent work stops until resolved. |
| Claude Pro / Claude Code credits are low but not exhausted | Keep using Claude Code for repo-scale work (nothing else does that job); shift *ad-hoc* reasoning/drafting to free ChatGPT first, then free Gemini/DeepSeek/Kimi. Return to Claude once credits refresh — don't keep defaulting to free tools out of habit. |
| Perplexity credits are low | Free ChatGPT → free Gemini for research, in that order; state which tier was actually used in the output, per Research's "cite what was checked" rule. |
| Need cheap, routine, in-editor chat/autocomplete (not repo-scale reasoning) | Continue.dev on local Ollama — $0, always available; Open WebUI is the local browser alternative (not dashboard-wired). |
| Fully offline / no internet at all | Continue.dev + Ollama / Open WebUI only — every other lane above needs a network connection. |
| A specific free tool's daily/rate quota is hit mid-task | Chain to the next free tool in the list (ChatGPT/Gemini/Grok/DeepSeek/Kimi) rather than waiting out the reset window, unless the task can wait. |

## Tiers

- **Primary premium** — Claude Code / Cursor Pro (coding), Claude Pro (high-stakes
  synthesis), Perplexity Pro (research).
- **Preferred fallback** — free ChatGPT, then free Gemini / Grok, when a premium tool
  is `DEGRADED`/`BLOCKED` or credits are low.
- **Acceptable low-cost / always-available** — Continue.dev + Ollama, Open WebUI
  (local), free DeepSeek/Kimi (manual overflow), Azure DeepSeek router for sustained API.
- **Launch-only / manual, not yet integrated** — VS Code itself; Slack/Calendar/Email
  inbound (product Slack *outbound* webhook is separate — see integrations inventory).
- **Paused / optional** — GitHub Copilot (+ Chat): not required, not default
  (`docs/TOOL_CATALOG.md` `status: paused`).
- **Removed, not future work** — Cline, Cline Nightly. Don't re-propose them as
  "another option" for this stack.

## Best-use guidance by task type

| Task type | Primary | Fallback |
|---|---|---|
| High-stakes synthesis / architecture | Claude Pro / Claude Code | free ChatGPT → free Gemini |
| Coding and repo edits | Claude Code / Cursor Pro | Continue.dev + Ollama / Open WebUI for small drafts |
| Research and comparison | Perplexity Pro | free ChatGPT → free Gemini → manual |
| Critique / second-pass review | A *different* tool than the one that produced the first draft (e.g. Gemini reviewing Claude output) | any other available tier-2 tool |
| Note filing / Obsidian formatting | Claude Code (Chief's own logging responsibility) | manual by David if the vault is unreachable |
| Cheap fallback when credits are low | Continue.dev / Open WebUI (local Ollama, $0) | free ChatGPT/Gemini/Grok/DeepSeek/Kimi (manual) |

---

### claude-code
- **role:** primary agent runtime — every agent acts through it
- **owner_agent:** Chief (all agents)
- **fallback chain:** none. This is the top of the stack — there is no fallback
  agent runtime.
- **known constraints:** a true single point of failure, by design.
- **when to prefer fallback:** never applicable. If `BLOCKED`, all agent work stops
  until resolved — that's a real outage, not a routing decision.

### github
- **role:** repo, PRs, CI — Build's primary execution surface
- **owner_agent:** Build
- **fallback chain:** primary `gh` CLI/API → first fallback plain `git` directly
  against the remote (covers clone/commit/push, not PR/API-specific actions) →
  degraded path: David performs the blocked action via the GitHub web UI.
- **known constraints:** no alternate git host configured. CI/Actions being down is
  a separate concern from the GitHub API/CLI being down.
- **when to prefer fallback:** `gh` erroring while plain `git` still works — use
  `git` for that specific operation; escalate to Chief if a PR-specific action
  (merge/review) is blocked with no CLI/API path.

### vercel
- **role:** hosting/deploy platform — Build's read-only status surface
- **owner_agent:** Build (Reliability, reserved)
- **fallback chain:** primary Vercel MCP tools (`get_deployment`,
  `get_runtime_errors`, read-only) → first fallback `gh pr checks` (CI status often
  mirrors the Vercel preview build result) → degraded path: David checks the Vercel
  dashboard directly.
- **known constraints:** no alternate hosting; env vars/production config stay
  human-only regardless of health state — a fallback never touches that boundary.
- **when to prefer fallback:** Vercel MCP tools erroring/timing out — use
  `gh pr checks` for a coarser signal; ask David directly for anything urgent.

### supabase
- **role:** database/backend
- **owner_agent:** Build (Reliability, reserved)
- **fallback chain:** primary live Supabase API (`fetchCommandCenterData`) → first
  fallback `mergeWithMockFallback` → second fallback full mock mode
  (`isLiveApiEnabled() === false`).
- **known constraints:** **this fallback chain already exists in shipped code** —
  `DataContext`'s own `source` field tracks `"mock" | "supabase" | "mock-fallback"`
  today. Reliability's job here is narrower than most: recognize and surface a
  sustained `mock-fallback` state as `DEGRADED`, not invent a new fallback.
- **when to prefer fallback:** already automatic at the app level on any Supabase
  fetch error; Reliability's role (once active) is to flag a *sustained*
  `mock-fallback` state rather than let it go unnoticed.

### obsidian-buildlog
- **role:** Chief's Build Log / Agent Log
- **owner_agent:** Chief
- **fallback chain:** primary direct vault file write → first fallback keep the
  entry in the active session and backfill to the vault once accessible →
  no further fallback — a missed entry gets backfilled, not dropped.
- **known constraints:** single local vault, no redundant copy.
- **when to prefer fallback:** vault path unreachable/permission error — don't block
  the actual task on it; note the gap and backfill as soon as possible.

### perplexity-pro
- **role:** Research's live web-search tool
- **owner_agent:** Research
- **fallback chain:** primary Perplexity Pro → first fallback free ChatGPT → second
  fallback free Gemini → degraded path David runs the search manually and hands
  Research the results.
- **known constraints:** every fallback here is a consumer chat subscription with no
  agent-callable API today (per Tool Catalog) — "fallback" currently means David
  manually relaying results, not an automated switch.
- **when to prefer fallback:** Perplexity unreachable/degraded, rate-limited, **or
  David's Perplexity credits are low** — proceed with a fallback but state in the
  research output which tier was actually used, per Research's existing "cite what
  was checked" rule.

### claude-pro
- **role:** Research/Content's ad-hoc reasoning/drafting outside repo-scale work
- **owner_agent:** Research, Content
- **fallback chain:** primary Claude Pro (claude.ai) → first fallback free ChatGPT →
  second fallback free Gemini/DeepSeek/Kimi (whichever's available).
- **known constraints:** same no-agent-API-today caveat as Perplexity.
- **when to prefer fallback:** same as Perplexity — degraded/unreachable **or Claude
  credits are low** — state which tier was used. **Return to Claude Pro once credits
  refresh or the primary is confirmed available again** — don't keep defaulting to a
  free-tier tool out of habit.

### continue-dev
- **role:** editor-side autocomplete + cheap/routine chat, local Ollama, $0 cost
- **owner_agent:** — (David's own editor tooling)
- **fallback chain:** none needed in the usual sense — this *is* the always-available
  low-cost lane other tools fall back to. If Ollama itself is down locally, David
  falls back to Claude Code directly for the same task.
- **known constraints:** local-only; quality is lower than Claude Pro/Claude Code for
  anything beyond autocomplete/simple chat — not a substitute for repo-scale
  reasoning, just for cheap/routine work.
- **when to prefer fallback:** never applicable — this tool exists to *be* the
  fallback for premium tools when credits are low.

### cursor
- **role:** Build's secondary code-drafting tool
- **owner_agent:** Build
- **fallback chain:** primary Cursor → fallback Claude Code itself (already Build's
  primary tool — Cursor being unavailable removes an alternate drafting path, not a
  blocker).
- **known constraints:** low blast-radius if degraded; Claude Code covers the same
  ground.
- **when to prefer fallback:** any Cursor issue — just proceed with Claude Code
  directly, no escalation needed.

### sentry
- **role:** error tracking (not yet connected)
- **owner_agent:** Build, Research (Reliability, reserved)
- **fallback chain:** primary Sentry (once connected) → fallback Vercel
  `get_runtime_errors` (already real, already in use) → second fallback manual log
  review by David.
- **known constraints:** not yet connected — today the "fallback" is actually the
  only real signal in active use.
- **when to prefer fallback:** currently always, until Sentry is actually wired in.

### free-tier AI overflow chain (chatgpt-free, gemini-free, deepseek-free, kimi-free)
- **role:** manual overflow/second-opinion chat when primary AI tools are
  low-credit, rate-limited, or degraded
- **owner_agent:** Research, Content
- **fallback chain:** no fixed primary among these four — whichever David is
  already using; chain among each other (no required order) when one is
  unavailable; degraded path David decides manually, no agent automation.
- **known constraints:** none are agent-callable APIs today — all require David to
  relay input/output by hand.
- **when to prefer fallback:** Claude Pro/Perplexity is down or rate-limited and the
  task can't wait.

**Researched free-tier limits (2026-07-04)** — real numbers, not guesses; full
citations live on each tool's block in `docs/TOOL_CATALOG.md`:

| Tool | Free-tier limit | Best for | Source |
|---|---|---|---|
| ChatGPT (free) | ~10 messages / 5-hour rolling window on the flagship model, then falls back to a smaller model; no fixed daily cap | Quick second opinion, short overflow chat | [OpenAI Help Center](https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq) |
| Gemini (free) | AI Studio itself is unlimited/free to browse; a free API key gets ~1,500 req/day, 1M TPM on Gemini 2.5 Flash (Pro is far more limited, ~50 req/day, API access paid-only since Apr 2026) | Large-context/multimodal, and free-form chat via AI Studio | [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) |
| DeepSeek (free) | Web chat (chat.deepseek.com) — unlimited flagship-model access, no Plus/Pro tier exists; API — 5M free tokens for new accounts (30-day expiry), no hard per-user rate cap after | Manual overflow chat; cheapest option if API access is ever wired in | [DeepSeek API docs](https://api-docs.deepseek.com/quick_start/pricing) |
| Kimi (free) | kimi.com "Adagio" plan — unlimited basic chat/file upload, no account required; agent/deep-research/coding modes are metered separately; API capped ~1,000 req/day | Manual overflow chat; not for agentic/coding workloads on the free plan | [Moonshot AI platform](https://platform.moonshot.ai/) |
| GitHub Copilot (free) | 2,000 code completions/mo + 50 chat messages/mo, auto model selection only | **Paused/optional — not required/default; prefer Continue.dev + Ollama** | [GitHub Copilot plans](https://docs.github.com/en/copilot/get-started/plans) |
| Ollama local (`qwen2.5-coder:7b`/`14b`, current config) | $0, fully offline, no quota | Editor autocomplete + cheap/routine chat (Continue.dev); Open WebUI browser UI | see `docs/TOOL_CATALOG.md` `ollama-local` / `open-webui` |

---

## Gaps — intentionally not covered this pass

Tools named in past requests but not yet confirmed as part of True Crew's actual
stack (no reference in `docs/TOOL_CATALOG.md`, `CLAUDE.md`, or `package.json`):
PostHog, Resend, Inngest, Drizzle, Zod, Figma, Stripe, QuickBooks, Google Workspace,
OneDrive. Also not covered: **VS Code** (David's own editor, not agent-critical),
**Slack/Calendar/Email** (no confirmed agent use case — see Tool Catalog). Add a
real entry here (and to `docs/TOOL_CATALOG.md` first) once any of these is actually
adopted — don't pre-build governance for a tool that isn't in use.

**Deliberately excluded, not a gap:** Cline, Cline Nightly — see
`docs/TOOL_CATALOG.md` `status: removed`. **GitHub Copilot** is `paused` (optional,
not default) — do not treat it as core stack without an explicit request.
Open WebUI is cataloged as local-only (`open-webui`) — not a dashboard integration.

## Related

- Catalog: `docs/TOOL_CATALOG.md` (per-tool `health_state` field)
- Runbook: `docs/AGENT_RUNBOOK.md` § Reliability Agent, § Tool Catalog
- Reference: [tool-access](tool-access.md), [repair-playbook](repair-playbook.md)
