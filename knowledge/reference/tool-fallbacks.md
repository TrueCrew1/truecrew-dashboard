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
- **when to prefer fallback:** Perplexity unreachable/degraded and the task can't
  wait — proceed with a fallback but state in the research output which tier was
  actually used, per Research's existing "cite what was checked" rule.

### claude-pro
- **role:** Research/Content's ad-hoc reasoning/drafting outside repo-scale work
- **owner_agent:** Research, Content
- **fallback chain:** primary Claude Pro (claude.ai) → first fallback free ChatGPT →
  second fallback free Gemini/DeepSeek/Kimi (whichever's available).
- **known constraints:** same no-agent-API-today caveat as Perplexity.
- **when to prefer fallback:** same as Perplexity — state which tier was used.

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

---

## Gaps — intentionally not covered this pass

Tools named in the request but not yet confirmed as part of True Crew's actual
stack (no reference in `docs/TOOL_CATALOG.md`, `CLAUDE.md`, or `package.json`):
PostHog, Resend, Inngest, Drizzle, Zod, Figma, Stripe, QuickBooks, Google Workspace,
OneDrive. Also not covered: **Copilot** (already classified `HUMAN-ONLY`, explicitly
not wired into this dev environment per `CLAUDE.md` — no fallback chain needed for a
tool that's never in the primary position), **VS Code** (David's own editor, not
agent-critical), **Slack/Calendar/Email** (no confirmed agent use case — see Tool
Catalog). Add a real entry here (and to `docs/TOOL_CATALOG.md` first) once any of
these is actually adopted — don't pre-build governance for a tool that isn't in use.

## Related

- Catalog: `docs/TOOL_CATALOG.md` (per-tool `health_state` field)
- Runbook: `docs/AGENT_RUNBOOK.md` § Reliability Agent, § Tool Catalog
- Reference: [tool-access](tool-access.md), [repair-playbook](repair-playbook.md)
