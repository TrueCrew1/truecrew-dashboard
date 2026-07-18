# Tool & Model Routing Standard

## Purpose

This is the governance standard for **which class of AI tool is the default**
for a given kind of work in this repo, and under what condition a cloud
model may be used instead. It is deliberately narrow: `knowledge/reference/
tool-fallbacks.md` already owns *degradation/outage* routing ("primary tool
is `DEGRADED`/`BLOCKED`, what's next") in full detail — this doc does not
restate it. What's missing today, and what this doc adds, is an explicit,
citable statement that **local (Ollama) is the default tier, and any cloud
model is opt-in escalation** — a governance/compliance framing, not an
operational fallback chain.

## Current state (verified on `main` as of this doc)

- **Continue.dev autocomplete/chat** runs on local Ollama
  (`qwen2.5-coder:7b`/`14b`) — the decided, $0-cost editor-AI lane per
  `CLAUDE.md` § Tool routing and `docs/TOOL_CATALOG.md` → `continue-dev`.
  `CLAUDE.md` is explicit that this is a **two-tool stack, Claude Code +
  Continue.dev on local Ollama**, and that Cline/Cline Nightly/GitHub
  Copilot Chat were deliberately removed as duplicate agent tooling — not
  something to reintroduce as "another option."
- **Librarian agent's optional Tier 1 refinement** calls local Ollama
  directly (`lib/librarian/refine.ai.ts`, env vars `OLLAMA_HOST` /
  `OLLAMA_MODEL=llama3.2` in `.env.example`), gated off by default via
  `LIBRARIAN_AI_ENABLED=false`.
- **Claude Code** is the primary repo-scale coding agent (`docs/AGENT_RUNBOOK.md`,
  `docs/TOOL_CATALOG.md` → `claude-code`) — not a routing alternative to
  Ollama, a different tier entirely (repo-scale reasoning vs. cheap/local
  autocomplete).
- No Azure/GPT-5-mini/Kimi/DeepSeek cloud-fallback code exists on `main` yet
  — see below.

## In-flight, not yet merged — do not cite as current policy

- PRs #121/#122/#123 (`claude/chief-ai-voice-v1-c7q9n5-backend/-frontend/
  -voice`) propose a Chief-level Azure AI Foundry fallback chain (GPT-5-mini
  / Kimi K2.6 / DeepSeek V4 Pro, routed by query category), itself falling
  back to a *second*, local-only Ollama tier (`llama3`/`deepseek-r1`) on
  Azure failure or when the cloud tier is disabled. Real, substantial work
  — but unmerged as of this doc.
- PR #131 (`claude/ai-tool-operating-guide-7dkmmk`) proposes
  `docs/agents/CHIEF_OPERATING_SYSTEM.md`, which narrates this same routing
  chain in more detail. Also unmerged — neither the code nor that doc
  exists on `main` today.
- The standard below is written so it already holds for that in-flight
  design (Ollama as the fallback-under-the-fallback, cloud off by default)
  — merging those PRs should not require revising this doc.

## Standard (forward-looking policy)

1. **Ollama is the default local-first tier** for any AI-assisted feature in
   this repo, present or future. A cloud model is opt-in escalation, gated
   by an explicit feature flag (`LIBRARIAN_AI_ENABLED` today; the proposed
   `CHIEF_AI_FALLBACK_ENABLED` once #121-123 merge) — never the unconditional
   default.
2. Any cloud fallback chain, once merged, must degrade back to the local
   Ollama tier on cloud failure — matching the pattern already proposed in
   PRs #121-123 — rather than hard-failing a user-facing request.
3. Manual, human-relayed AI tools (free-tier ChatGPT/Kimi/DeepSeek/Gemini/
   Claude Pro web chat) stay `HUMAN-ONLY` / `launch-only` per
   `docs/TOOL_CATALOG.md` — never wired for direct agent/API access, per the
   existing classification.
4. Any new AI/model integration updates **this doc** (routing policy) and
   its **own row in `docs/TOOL_CATALOG.md`** (the authoritative per-tool
   record) in the same change — this doc summarizes the policy, it does not
   replace the per-tool record.

## Lane classification

Per the lane types defined in `docs/AGENT_TOOL_LANES.md`:

| Tier | Lane | Why |
|---|---|---|
| Ollama (local) | READ-ONLY / PROPOSE-ONLY | Advisory text or autocomplete suggestions only — nothing it produces writes to the repo without Claude Code or a human applying it. |
| Cloud fallback tier (Azure/GPT-5-mini/Kimi/DeepSeek), once merged | READ-ONLY / PROPOSE-ONLY | Same — advisory-only per the proposed Chief architecture; no cloud model commits, pushes, or merges directly (`docs/agents/CHIEF_OPERATING_SYSTEM.md` § 6, once merged). |
| Manual web-chat tools (ChatGPT/Kimi/DeepSeek/Gemini/Claude Pro) | HUMAN-ONLY | No agent-callable API today; David relays results by hand per `knowledge/reference/tool-fallbacks.md`. |

## See also

- `knowledge/reference/tool-fallbacks.md` — degradation/outage fallback
  chains (what to use when a primary tool is `DEGRADED`/`BLOCKED`). This
  doc is policy for the *default* tier; that doc is what to do when the
  default or a primary breaks — read both, don't treat one as replacing
  the other.
- `docs/TOOL_CATALOG.md` → `ollama-local`, `continue-dev` — authoritative
  per-tool records.
- `docs/AGENT_TOOL_LANES.md` — the lane matrix this doc's classification
  table maps onto.
- `docs/internal/agent-bot-compliance-plan.md` — bot/workflow compliance
  specifically (GitHub Actions, GitHub Apps); this doc covers AI tool/model
  routing, a related but distinct governance surface.
- `CLAUDE.md` § Tool routing — the human-facing routing table this doc's
  "Current state" section quotes from.
