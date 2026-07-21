# Research Tool Setup

Local-only setup notes for David's research/AI provider tools (Perplexity, Azure
OpenAI, Kimi, DeepSeek, GPT-5 mini, etc.). This doc governs nothing new — it points at
the existing classifications in `docs/TOOL_CATALOG.md` and `docs/AGENT_RUNBOOK.md` §
Tool Catalog / § External Services Tool Catalog, and the personal-stack decision in
`CLAUDE.md` § Tool routing (which itself points at the global `~/.claude/CLAUDE.md`).
If anything here looks like it contradicts those, the runbook and tool catalog win —
fix this doc, not the other way around.

## Manual-only tools (human-run, never agent-callable)

Per `docs/TOOL_CATALOG.md` § AI, every general-purpose research/chat tool in David's
personal stack is `status: manual` / `access_type: launch-only` — David opens it in a
browser and relays anything useful to an agent by hand. No agent has API or programmatic
access to any of these, regardless of whether David is logged in:

| Tool | Use | Classification |
|---|---|---|
| Perplexity Pro | live web/current-events research | manual, launch-only |
| free Gemini | large-context/multimodal tasks | manual, launch-only |
| free ChatGPT | manual overflow/second opinion | manual, launch-only |
| free DeepSeek | manual overflow when Claude credits are low | manual, launch-only |
| free Kimi | manual overflow chat | manual, launch-only |

Azure OpenAI / GPT-5 mini (or any other API-key-based provider David wires into a
personal local script) fall in the same bucket by default: **manual**, until they get
an explicit row in `docs/TOOL_CATALOG.md` classified `AGENT-ELIGIBLE`. A local script
that David runs himself with his own key is not an agent-usable integration.

## Agent-usable tools

Today, **Claude Code is the only `fully-wired`, `AGENT-ELIGIBLE` AI tool** (see
`docs/TOOL_CATALOG.md` § AI → `claude-code`). Nothing in the manual-only list above is
callable by Chief, Planner, Build, Research, Content, or Reliability. Wiring any of
them up as agent-usable requires an explicit classification change in both
`docs/TOOL_CATALOG.md` (the row) and `docs/AGENT_RUNBOOK.md` § Tool Catalog (the
reasoning) — not a config change alone.

## Explicitly human-only, regardless of connection status

Per `docs/AGENT_RUNBOOK.md` § Tool Catalog → Docs & notes:

| Tool | Classification | Why |
|---|---|---|
| Notion | HUMAN-ONLY | Not authorized in this environment; also redundant with Obsidian as the vault of record. |
| Google Drive | HUMAN-ONLY | Contents/sensitivity not scoped; revisit only for one specific, narrow folder. |

These stay HUMAN-ONLY even after David personally connects or signs into them — see
the rule below.

## Connecting a tool personally does not authorize agent use

`docs/AGENT_RUNBOOK.md` § Tool Catalog states this directly: *"no agent has been wired
into any tool listed here as AGENT-ELIGIBLE; classification is a prerequisite for
wiring one up later, not a grant of access. Default is least privilege: if a tool's
real use is unconfirmed or its blast radius is unclear, it defaults to HUMAN-ONLY."*

Concretely for research tools: David logging into Perplexity, adding a Kimi API key to
a local `.env.local`-style file, or connecting a new provider for his own scripts is a
**personal-stack** decision (`CLAUDE.md` § Tool routing, global `~/.claude/CLAUDE.md`)
and grants zero access to any Chief-system agent. Agent access is a separate,
explicit step: a new or updated row in `docs/TOOL_CATALOG.md`, reasoned in
`docs/AGENT_RUNBOOK.md`, before any agent may call it.

## Where keys live

Copy `docs/research-tools.env.example` to a local, gitignored env file (matching this
repo's `*.local` `.gitignore` pattern) and paste real keys there only. Never commit a
real key, and never paste one into `docs/TOOL_CATALOG.md`, this doc, or any other
tracked file.

## See also

- `docs/TOOL_CATALOG.md` — the stable, machine-readable tool record.
- `docs/AGENT_RUNBOOK.md` §§ Tool Catalog, External Services Tool Catalog — the
  reasoning behind each classification.
- `docs/AGENT_CAPABILITIES_SUMMARY.md` — the fast Verified/Partially-wired/Manual
  table; cites this doc directly for why the `research-tools.env.example` vars
  (`KIMI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, etc.) are Manual, not agent
  access, despite sharing model names with Chief's Azure fallback tier.
- `docs/agents/CHIEF_OPERATING_SYSTEM.md` §3(B) — how these manual tools fit into
  Chief's overall tool-stack picture.
- `knowledge/reference/tool-fallbacks.md` — fallback chains and best-use-by-task
  guidance for the tools already in active use.
- `CLAUDE.md` § Tool routing — where the personal-stack vs. agent-governance split is
  decided.
