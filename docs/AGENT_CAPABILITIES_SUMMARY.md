# Agent Capabilities Summary

A short, citable answer to "are we wired for X?" — derived from
`docs/TOOL_CATALOG.md`, `docs/AGENT_RUNBOOK.md`,
`docs/agents/CHIEF_OPERATING_SYSTEM.md`, `docs/AGENT_TOOL_LANES.md`,
`docs/RESEARCH_TOOL_SETUP.md`, and `.env.example`. This is a summary, not a
new source of truth: if it ever disagrees with those files, they win —
update this doc, don't trust it over them.

## The verification standard

**"Verified" is never asserted from memory or general knowledge of what
"should" be wired by now — it means citable, right now, in this repo's
code, config, env, or docs.** Every tool/model in the table below gets
exactly one of these labels, never a looser one:

- **Verified** — real, working, unconditional access. `docs/TOOL_CATALOG.md`
  status `fully-wired`, and env vars (if any) documented in `.env.example`.
- **Partially wired** — real, working access, but scoped, gated, or off by
  default (read-only, feature-flagged, propose-only). `docs/TOOL_CATALOG.md`
  status `partially-wired`. Don't round this up to "Verified" — the gating
  is the point.
- **Manual** — a human runs it by hand; zero agent-callable access,
  regardless of whether David is logged in. `docs/TOOL_CATALOG.md` status
  `manual`, or `access_type: launch-only`.
- **External** — a real third-party service, possibly even connected, with
  no agent classification yet. `docs/AGENT_TOOL_LANES.md` **UNCLASSIFIED**,
  or `docs/TOOL_CATALOG.md` status `future-integration`. Defaults
  HUMAN-ONLY until classified.
- **Proposed** — an idea or candidate row, not implemented — e.g. the
  "Priority candidates" lists in `docs/AGENT_RUNBOOK.md`. No code or config
  backs it yet.
- **Placeholder** — a scaffold exists in code but the feature doesn't work
  — e.g. a route that always returns `501`. Real code, zero live function.

Chief must treat anything short of **Verified** or **Partially wired** as
unavailable for automatic use unless David explicitly overrides in the
conversation.

## Capability table

| Tool | Provider | Status | Env vars (`.env.example`) | Lane |
|---|---|---|---|---|
| GPT-5 mini | OpenAI, via Azure AI Foundry | **Partially wired** | `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY`, `AZURE_AI_DEPLOYMENT_GPT5_MINI` | Chief AI fallback — general/unclassified queries only, when `resolveChiefCommand` finds no specialist match and `CHIEF_AI_FALLBACK_ENABLED=true` |
| DeepSeek V4 Pro | DeepSeek, via Azure AI Foundry | **Partially wired** | `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY`, `AZURE_AI_DEPLOYMENT_DEEPSEEK_V4_PRO` | Chief AI fallback — reasoning/strategy/analysis queries |
| Kimi K2.6 | Moonshot AI, via Azure AI Foundry | **Partially wired** | `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY`, `AZURE_AI_DEPLOYMENT_KIMI_K2_6` | Chief AI fallback — code/refactor/long-context queries |
| Chief Voice v1 | Browser-native (Web Speech API / SpeechSynthesis) | **Verified** | none required — client-side only | Chief panel push-to-talk input + per-response "Speak" output, entirely in-browser |

**Why the three Azure models are Partially wired, not Verified:** all three
are read-only advisory text only, off by default
(`CHIEF_AI_FALLBACK_ENABLED=false`), and only ever reached when Chief's
deterministic router finds no match — real and working when enabled, but
gated on three conditions, not unconditional access. Chief Voice v1 has none
of those conditions, so it's Verified.

Sources: `docs/TOOL_CATALOG.md` rows `azure-ai-foundry`, `gpt5-mini`,
`deepseek-v4-pro`, `kimi-k2-6`, `chief-voice-v1`; `docs/AGENT_RUNBOOK.md` §
Chief AI Fallback Routing and § Voice Prep (Scaffold Only);
`docs/agents/CHIEF_OPERATING_SYSTEM.md` §3 for the full reasoning behind the
two separate surfaces below.

**One shared resource, not three accounts.** GPT-5 mini, DeepSeek V4 Pro, and
Kimi K2.6 are three deployments on a single Azure AI Foundry resource — one
endpoint, one key (`AZURE_AI_ENDPOINT` / `AZURE_AI_KEY`), one deployment-name
var per model. That's the *app's* env, read by `lib/azureAi/client.ts`.

**Don't confuse this with `docs/research-tools.env.example`.** That file
*does* define `OPENAI_API_KEY`, `KIMI_API_KEY`, `DEEPSEEK_API_KEY`, and
`AZURE_OPENAI_*` — but those are David's own personal, local research
scripts, never read by this app or any agent (that file's own header says so
explicitly). Status: **Manual**. See `docs/RESEARCH_TOOL_SETUP.md`. Two
separate namespaces, two separate purposes — don't cite one file's vars as
evidence for the other's tool.

**Chief Voice v1 needs no vendor at all.** Push-to-talk input and the
"Speak" button run entirely on the browser's native `SpeechRecognition` and
`SpeechSynthesis` APIs (`src/components/chief/useChiefVoice.ts`) — real, live,
no server round-trip, no env var.

**Chief voice uses the browser's native Web Speech API
(`SpeechRecognition`/`webkitSpeechRecognition`) for speech-in, and the
browser's native `SpeechSynthesis` API for speech-out** — no model, no SDK,
no npm/pip package, no API key, for either direction; it's a browser
capability, not a wired third-party service. This is a **Verified** path; if
voice breaks, check `src/components/chief/useChiefVoice.ts` first (no env
var applies — there's nothing to misconfigure) and, for a browser-support
issue specifically, `inputStatus === "unsupported"` (speech-in) or
`speakSupported === false` (speech-out) in that same file.

## Known gap — Placeholder, not Verified

**Server-side voice** (a future transcription/TTS tier, distinct from Chief
Voice v1 above). Status: **Placeholder**. `api/chief/transcribe.ts` and
`api/chief/speak.ts` both always return `501 Not Implemented`. No
transcription or TTS vendor has been chosen — both files' own TODO comments
say so explicitly ("not scoped/decided"), and `docs/AGENT_RUNBOOK.md` §
Voice Prep (Scaffold Only) confirms picking a vendor and wiring it is
unscoped future work.

Do not add an Azure Speech (or any other vendor's) env var for this until
David picks a vendor — inventing placeholder keys for an unmade vendor
decision would misrepresent it as further along than it is.

## Chief's script: "are we wired for X?"

1. Check the table above first. If X is listed, answer with its status and
   cite the `docs/TOOL_CATALOG.md` row id and the `.env.example` line(s) — the
   answer should be checkable in ten seconds, not taken on trust.
2. If X isn't listed here, check `docs/TOOL_CATALOG.md` directly (search by
   name). If a row exists, apply the verification standard above and cite
   that row.
3. If X has a `TOOL_CATALOG.md` row but its env vars aren't in `.env.example`
   (or vice versa), it's not Verified — pick the accurate label (Partially
   wired / Manual / External / Placeholder, per the definitions above), say
   so explicitly, name the specific gap, and don't imply it's ready to use.
4. If X has no `TOOL_CATALOG.md` row at all, say plainly "not in the tool
   catalog — no wiring exists." Don't guess or imply availability. If it's a
   real proposal worth tracking, log it to `01_DASHBOARD/Parking Lot.md` per
   the Scope Guardrail — don't wire it up unprompted.
5. Never report a tool as Verified from memory or general knowledge of what
   "should" be wired by now — always cite the specific `TOOL_CATALOG.md` row
   and/or `.env.example` line used to answer.

## See also

- `docs/agents/CHIEF_OPERATING_SYSTEM.md` — Chief as front door: what it is,
  its role map, and the reasoning §3 this table summarizes.
- `docs/AGENT_RUNBOOK.md` — the operating contract (approval gates, Chief AI
  Fallback Routing, Voice Prep, § Knowledge Precedence & Task-Time Retrieval —
  this doc's tool-wiring labels are the specialized case of that section's
  general Verified/Cited/Provisional standard).
- `docs/TOOL_CATALOG.md` — the authoritative, machine-readable tool record
  this table is derived from.
- `docs/AGENT_TOOL_LANES.md` — the Claude Desktop/Code tool-to-lane mapping
  and Tool Use Contract.
- `docs/RESEARCH_TOOL_SETUP.md` — the manual-vs-agent-usable distinction for
  research provider keys (relevant to the `research-tools.env.example` note
  above).
