# Agent Tool Lanes

Which of David's connected Claude Desktop/Code tool extensions map to which lane of
work, and whether an agent is actually authorized to call each one today. This is a
**mapping, not a new policy** — every classification below is quoted from
`docs/TOOL_CATALOG.md`, `docs/AGENT_RUNBOOK.md` §§ Tool Catalog / External Services
Tool Catalog, or `docs/RESEARCH_TOOL_SETUP.md`. Where a tool has no existing
classification, it's marked **UNCLASSIFIED** rather than assigned one here — adding a
real classification is a `docs/TOOL_CATALOG.md` change, not a side effect of this doc.
For AI models/providers specifically, see `docs/AGENT_CAPABILITIES_SUMMARY.md` instead
— this doc covers Claude Desktop/Code tool extensions, not model routing. See also
`docs/agents/CHIEF_OPERATING_SYSTEM.md` for how Chief (the approval layer these access
levels ultimately feed) fits in.

**Note on lanes:** Sentry is grouped under **Build & Infra** below (matching its
actual `docs/TOOL_CATALOG.md` category `dev` and its `docs/AGENT_RUNBOOK.md` §
Dashboards & analytics placement alongside Vercel/Supabase), not Comms & Automation —
it's an error-tracking/observability tool, not a comms tool.

## Agent authority summary

This is the short lane map only. `docs/AGENT_RUNBOOK.md` remains the full law for what each role
must, must not, and must escalate.

| Role | Authority summary | Lane boundary |
|---|---|---|
| **Chief** | Approval router and decision filter only | No independent execution lane; never edits repo code, merges, deploys, or publishes directly. |
| **Planner / Orchestrator** | Planning, slicing, sequencing, prioritization drafts | No write authority over code or external tools beyond ordinary read-only context gathering. |
| **Standards Review** | Pre-Chief evidence/law check on pending requests | Not a new agent, no independent tool lane, no approval authority of its own. |
| **Build (Cursor execution lane)** | Owns Build & Infra lane at the access levels listed below | Real repo/code path; uses approval gates for merges, pushes, migrations, and other protected work. |
| **Discovery / Research** | Owns Research & Files & Web lane for read-heavy gathering and `knowledge/sources/` filing | No adoption authority, no parallel knowledge tree, no publishing. |
| **Content & Media** | Owns Design & Marketing draft lane where classified/authorized | Draft authority only; client/public/legal/critical copy always escalates. |

## Build & Infra

| Tool | Classification | Owner agent | Access level | Source |
|---|---|---|---|---|
| GitHub (`gh` CLI / web) | AGENT-ELIGIBLE | Build | EXECUTE-WITH-APPROVAL (merge/close, push); READ-ONLY (browsing) | `docs/TOOL_CATALOG.md` → `github` |
| GitKraken (MCP) | AGENT-ELIGIBLE, by inheritance — same repo/GitHub operations as the `github` row above, just a different client; no separate `docs/TOOL_CATALOG.md` row yet | Build | Same gate as GitHub: READ-ONLY for status/log/diff/blame; EXECUTE-WITH-APPROVAL for commit/push/PR merge/close | Inferred from `docs/TOOL_CATALOG.md` → `github`; flag for a real row if usage grows |
| Supabase | AGENT-ELIGIBLE | Build | READ-ONLY (schema/status); PROPOSE-ONLY (migrations, via code) | `docs/TOOL_CATALOG.md` → `supabase` |
| Vercel | AGENT-ELIGIBLE | Build | READ-ONLY (deploy status/preview URLs); production config/env vars HUMAN-ONLY | `docs/TOOL_CATALOG.md` → `vercel` |
| Sentry | AGENT-ELIGIBLE (classified, not yet connected — `status: future-integration`) | Build, Research | READ-ONLY | `docs/TOOL_CATALOG.md` → `sentry` |
| Netlify | HUMAN-ONLY | — | — | Deprecated infra; `docs/AGENT_RUNBOOK.md` § Tool Catalog → Dashboards & analytics |

## Research & Files & Web

| Tool | Classification | Owner agent | Access level | Source |
|---|---|---|---|---|
| claude-in-chrome | Not a `docs/TOOL_CATALOG.md` row — governed directly by Claude Code's own action-category rules | Research | Read-heavy browsing/research: Regular. Any form submission, purchase, login, or message send still needs the same explicit confirmation it would in any session | Claude Code system instructions, not this repo's docs |
| Google Drive | HUMAN-ONLY (read-only or not) | — | — | `docs/AGENT_RUNBOOK.md` § Tool Catalog → Docs & notes: "Not authorized in this environment... no clear need yet" |
| Desktop Commander | **UNCLASSIFIED** — no existing row in `docs/TOOL_CATALOG.md` or `docs/AGENT_RUNBOOK.md` | — | Defaults to least-privilege/HUMAN-ONLY until classified — controls the local filesystem/terminal directly, high blast radius | n/a |

**Note on research/AI lanes:** Perplexity and Grok aren't Claude Desktop/Code tool
extensions, so they don't get a table row here — see
`docs/AGENT_CAPABILITIES_SUMMARY.md` for AI models/providers generally. Quick
agent-facing reference only: Perplexity Pro is the PRIMARY research lane; Grok is
NON-PROD_WEB_AI only (X/social sentiment, never the default). Follow the canonical
operator rule in `knowledge/reference/tool-fallbacks.md` → "Perplexity / Grok
research lane" — don't restate or diverge from it here.

## Design & Marketing

| Tool | Classification | Owner agent | Access level | Source |
|---|---|---|---|---|
| Wix | AGENT-ELIGIBLE | Content | PROPOSE-ONLY — draft only, David publishes | `docs/AGENT_RUNBOOK.md` § External SaaS |
| Figma | **UNCLASSIFIED** | — | Defaults to least-privilege — explicitly named as out-of-scope in `knowledge/reference/tool-fallbacks.md` ("no confirmed use in this repo") | `knowledge/reference/tool-fallbacks.md` |
| Canva | HUMAN-ONLY | — | — | `docs/AGENT_RUNBOOK.md` § External SaaS: "Connected but not yet authorized in this environment; no established True Crew use case yet" |

## Comms & Automation

| Tool | Classification | Owner agent | Access level | Source |
|---|---|---|---|---|
| Gmail | HUMAN-ONLY | — | — | `docs/AGENT_RUNBOOK.md` § External SaaS: "Interpersonal comms + inbox PII; too sensitive for even read access right now" |
| Zapier | HUMAN-ONLY | — | — | `docs/AGENT_RUNBOOK.md` § External SaaS: "Deliberately unscoped/broad by design" |

## Tool Use Contract

Copy-paste block for Claude Desktop/Cowork Project instructions. It only tells agents
to act where an access level above already authorizes it — it does not grant any new
access, and it does not contradict any HUMAN-ONLY classification above.

```
## Tool Use Contract (TrueCrew agents)

In the TrueCrew project, use enabled tools directly whenever they are the fastest
truthful path — don't describe an action in prose when a tool can perform or verify
it. A tool being connected/available in Claude Desktop or Claude Code is not by
itself authorization to use it: only a classification in docs/TOOL_CATALOG.md +
docs/AGENT_RUNBOOK.md, plus this contract, authorizes real use. See
docs/AGENT_TOOL_LANES.md for the full mapping and reasoning behind every line below.

Build & Infra — use directly, at the access level already approved:
- GitHub / GitKraken: READ-ONLY for status, log, diff, blame, anytime. Commit, push,
  or PR merge/close only after a cleared ApprovalCard — same gate for both clients.
- Supabase: READ-ONLY for schema/status anytime. Migrations are PROPOSE-ONLY.
- Vercel: READ-ONLY for deploy status/preview URLs anytime. Production config and
  env vars stay HUMAN-ONLY — do not attempt.
- Sentry: READ-ONLY once connected.

Research & Files & Web — use for real research/context, not prose-only suggestions:
- claude-in-chrome: browse and read directly for research. Any form submission,
  purchase, login, or message send still needs explicit confirmation, same as any
  other Claude Code session.
- Google Drive, Desktop Commander: HUMAN-ONLY / unclassified today. Do not read or
  write directly — tell David what you'd want to check and let him do it, or ask him
  to authorize a specific, narrow use first.

Design & Marketing — use for real drafts where authorized, not text-only mockups:
- Wix: draft page/copy changes directly (PROPOSE-ONLY) — David publishes.
- Figma, Canva: unclassified/HUMAN-ONLY today. Do not create or edit directly —
  propose the design change in words (or a mockup file) and let David execute it
  in-tool.

Comms & Automation — human-only, no exceptions today:
- Gmail, Zapier: never send, automate, or configure directly. Draft the message or
  the automation logic and hand it to David to send/enable.

Standing rule: if a tool isn't listed here or in docs/TOOL_CATALOG.md, treat it as
HUMAN-ONLY by default (least privilege) until it has a real classification — don't
infer authorization from the tool merely being connected.
```
