# Chief Operating System

What Chief is, in this repo, right now — as a shipped product feature and as an
agent role — and how it relates to the other tools in David's stack. This doc
introduces no new governance of its own; every classification below is quoted
or paraphrased from `docs/AGENT_RUNBOOK.md`, `docs/TOOL_CATALOG.md`,
`docs/AGENT_TOOL_LANES.md`, and `knowledge/reference/tool-fallbacks.md`. If
anything here looks like it contradicts those, they win — fix this doc, not
the other way around.

**Chief in one line:** the front door and governance layer for this repo's
agent ecosystem — the router to specialists/tools/models (§3, §4), and the
sole approval layer between any agent's output and David's decision (§2).
"Router," not "orchestrator": Chief doesn't run other agents as live
processes — Planner/Build/Research/Content are roles a session adopts, not
subprocesses Chief dispatches to. Chief itself never writes code or opens a
PR (§4, §6) — Claude Code does that, through Chief's gates.

---

## 1. Chief, as a product feature

Chief is a real, shipped part of the dashboard app, not a concept doc waiting
on code. It lives under `src/components/chief/` and `api/chief/`:

- **Approvals surfaces** — `ApprovalBoard.tsx`, `ApprovalStatusDashboard.tsx`,
  `ApprovalAlertsPanel.tsx`, `ApprovalAuditTimeline.tsx`,
  `ChiefApprovalsContext.tsx`, `chiefApprovalBoard.ts`, `agentApprovalGates.ts`
  (the typed `*ApprovalRequest` / `ApprovalCard` schema every agent request
  flows through).
- **Chief's own panels** — `ChiefPanel.tsx`, `ChiefHomePanel.tsx`,
  `ChiefBoard.tsx`, `ChiefQueueStrip.tsx`, `ChiefSituationBrief.tsx`,
  `AgentWorkBoard.tsx`, `SpecialistCards.tsx`, `RecentActivityStrip.tsx`,
  `GovernanceEventsPanel.tsx`, `CommandHistory.tsx`.
- **Command routing** — `chiefCommandRouter.ts` (`resolveChiefCommand`):
  deterministic keyword/regex dispatch against live operational data. This is
  the primary path and always wins when it matches.
- **API routes** — `api/chief/ask.ts` (the live command endpoint),
  `api/chief/approvals/index.ts`; plus two placeholder routes,
  `api/chief/speak.ts` and `api/chief/transcribe.ts`, both currently
  `501 Not Implemented` and not wired into any UI (voice scaffold only — see
  §4).
- **Voice** — `useChiefVoice.ts` is entirely client-side today (browser Web
  Speech API for push-to-talk input and "Speak" output). No server round-trip
  exists yet.

This is an in-app governance UI, not a chatbot skin — its job is turning agent
output into decisions David can act on quickly, per `AGENT_RUNBOOK.md`'s
Overview: *"Chief is the only path from any agent's output to the operator's
decision."*

## 2. Chief, as an agent role

Per `docs/AGENT_RUNBOOK.md` § Chief:

> **Purpose:** Approvals router and summarizer — the only path from any
> agent's request to the operator's decision.

Chief's responsibilities: convert every agent approval request into an
`ApprovalCard`; ensure the checklist (tests, risks, files, summary) is
actually populated, not a placeholder; present David a clear
Approve/Send-back/Reject decision with a recommendation up front; **filter,
bundle, and prioritize** before a card ever appears (Approval Load); and log
every outcome. Chief also runs the **Chief Intake Rule** before any planning
or execution — reading `knowledge/MEMORY.md`, the Master Priority List, and
the active-task doc to confirm what work is actually in scope right now.

This is the "co-founder-level governance" framing: Chief decides what's a
priority, what a PR's disposition should be, and — per §3 below — which of
the fallback/manual AI tiers (if any) is appropriate for a given piece of work.
It does **not** decide unilaterally: per the Rules, Chief "never bypasses or
dilutes an approval gate" and "never auto-merges, auto-deploys, or
auto-messages externally from a card action."

## 3. The tool stack around Chief

Two things both get called "Kimi," "DeepSeek," and "GPT-5-mini" in this
repo's docs — they are not the same integration, and this doc keeps them
separate on purpose:

**(A) Chief's own code-level Azure fallback** — real, shipped, off by default.
`lib/chief/modelRouter.ts` (`routeChiefFallback`) only ever runs after
`resolveChiefCommand` finds **no** deterministic specialist match
(`isGenericFallback: true`) — a real match always wins and this code never
runs. When it does run, and `CHIEF_AI_FALLBACK_ENABLED=true`, it calls Azure
AI Foundry (`azure-ai-foundry` in `docs/TOOL_CATALOG.md`) with the model
chosen automatically by query category — no manual override:

| Category | Model |
|---|---|
| general / unclassified | GPT-5-mini |
| code, refactor, long-context | Kimi K2.6 |
| reasoning, strategy, analysis | DeepSeek V4 Pro |

On Azure failure (or if the cloud tier is disabled), it falls through to a
local Ollama tier (`CHIEF_OLLAMA_FALLBACK_ENABLED`, `llama3` /
`deepseek-r1`) — reachable only in local dev (`vercel dev` on the same
machine as Ollama), a no-op in production. If everything fails or is
disabled, Chief keeps its canned generic response. Every tier fails soft; no
per-call `ApprovalCard` is needed since this is read-only advisory text, per
`docs/TOOL_CATALOG.md`'s `azure-ai-foundry` row. Flipping the feature flags
or setting the Azure env vars (`AZURE_AI_ENDPOINT`, `AZURE_AI_KEY`) is
Vercel project config — human-only.

**(B) David's manual, human-run tools** — separate accounts, separate quotas,
zero agent-callable API. Per `docs/TOOL_CATALOG.md` and
`docs/RESEARCH_TOOL_SETUP.md`:
- Free web chat — `chat.deepseek.com`, `kimi.com`, `chatgpt.com`,
  `gemini.google.com`, `claude.ai` — all `status: manual`,
  `access_type: launch-only`. David opens these in a browser and relays
  anything useful to an agent by hand; no agent has programmatic access.
- David's own local research scripts, keyed via
  `docs/research-tools.env.example` (`KIMI_API_KEY`, `DEEPSEEK_API_KEY`,
  `OPENAI_API_KEY`/`OPENAI_MODEL` for GPT-5-mini, `AZURE_OPENAI_*`). That
  file's own header is explicit: *"Nothing in this file is read by the
  dashboard app or by any Chief-system agent... adding a key here does NOT
  authorize any agent to use that provider."*

**Neither (A) nor (B) is wired into VS Code or Continue.dev.** Continue.dev
on this machine is configured for local Ollama only —
`~/.continue/config.yaml`, autocomplete on `qwen2.5-coder:7b`, chat/edit on
`qwen2.5-coder:14b` (`docs/TOOL_CATALOG.md` → `continue-dev`). GPT-5-mini,
Kimi, and DeepSeek are not configured as Continue.dev/VS Code models today —
don't imply otherwise in any future doc without a real config change to point
to.

**Ollama itself has two independent roles**, per `docs/TOOL_CATALOG.md` →
`ollama-local`: Continue.dev's autocomplete/chat backend (`qwen2.5-coder`),
and Chief's local-dev-only fallback tier (`llama3`/`deepseek-r1`, via
`lib/ollama/client.ts`). Same local install, two unrelated call paths.

## 4. Role map

- **Chief** — governance/approvals router and co-founder-level decision
  filter (§2 above). Decides priority, PR disposition, and which tool tier
  (if any) a piece of work should route through. Never edits this repo
  itself.
- **Claude Code** — primary implementer for this repo. All actual code/PR
  work in `truecrew-dashboard` flows through Claude Code, per
  `docs/AGENT_RUNBOOK.md`'s Build Agent and the Change Control section.
- **CodeRabbit** — automated PR reviewer/gate, configured via
  `.coderabbit.yaml` (not opened or changed by this doc). Reviews PRs Claude
  Code opens; part of the normal merge path, not a separate agent role.
- **GPT-5-mini / Kimi K2.6 / DeepSeek V4 Pro** — external models, reachable
  two ways: automatically via Chief's off-by-default Azure fallback (§3A,
  read-only advisory text only), or manually by David via free web chat or
  his own local scripts (§3B, human-relayed only). Not currently reachable
  from inside VS Code/Continue.
- **Ollama** — local, $0, two independent roles: Continue.dev's
  autocomplete/chat backend, and Chief's local-dev-only fallback tier (§3
  above).

## 5. Routing examples

Concrete cases, each tagged with which real path it uses:

1. **Chief prioritizes the auth fix; Claude Code implements; CodeRabbit
   reviews.** Chief Intake identifies the active Priority/Task
   (`docs/AGENT_RUNBOOK.md` § Chief Intake Rule); a `BuildApprovalRequest`
   card covers the merge gate; Claude Code opens the PR; CodeRabbit runs its
   configured checks before David approves the card. No AI-tool routing
   involved — this is the normal path for all real repo work.
2. **Chief needs a long-context ADR summary → route to Kimi.** This is
   surface (B): David copies the relevant ADR/doc text into
   `docs/prompts/kimi-doc-summarizer.md`'s prompt and runs it manually at
   `kimi.com` (or his own Kimi API script) — not an automatic Chief action.
   The summary comes back into the conversation/PR by hand, same as any
   Research-agent finding filed under `knowledge/sources/`.
3. **Chief needs a big repo triage → route to DeepSeek.** Also surface (B):
   `docs/prompts/deepseek-triage.md`'s prompt run manually against DeepSeek
   (web chat or David's local script), output fed back into Claude Code as
   input for a real PR — DeepSeek never touches the repo directly.
4. **Chief needs a quick, low-risk edit and reaches for GPT-5-mini.** Two
   possible paths depending on context: if this is Chief's own generic
   fallback answering a query with no deterministic match, it's surface (A)
   — automatic, off by default, advisory text only, governed entirely by
   `lib/chief/modelRouter.ts`. If David instead wants a small edit drafted
   outside Claude Code entirely, that's surface (B) —
   `docs/prompts/gpt5mini-quick-edit.md`, run manually, and any resulting
   diff still lands in this repo only via Claude Code + a normal PR, never
   applied directly by GPT-5-mini.
5. **Chief needs a private/offline test → use Ollama.**
   `docs/prompts/ollama-experiment.md`, run locally against `ollama-local`
   for a draft/experiment that never touches production repo files — distinct
   from Chief's own `llama3`/`deepseek-r1` fallback tier, which only ever
   produces advisory chat text, not code.

## 6. Safety

- **No large speculative refactors without an explicit GO from David.** This
  matches `AGENT_RUNBOOK.md`'s Scope Guardrail: Chief may not invent new tool
  families or subsystems on its own initiative, and any good idea that
  surfaces out of scope gets parked, not executed.
- **No deleting "superseded" branches/PRs without verifying the feature was
  actually ported.** Consistent with the Daily Build Health Check workflow's
  "do not edit code or merge/close anything directly" rule and Build's merge
  gate — a branch/PR close is a `BuildApprovalRequest`, not an assumption.
- **Tests and QA are required for feature changes.** Per Build's verification
  requirements: `npm run qa` (or equivalent) actually run, the real result
  recorded — never claim a check ran that didn't.
- **Only Claude Code edits this repo.** GPT-5-mini, Kimi, DeepSeek, and Ollama
  — whichever surface — act via proposals and scripts only, per §3 and §5
  above; none of them commit, push, or merge directly. Every actual repo
  change still goes through Claude Code and the normal PR/CodeRabbit/Chief
  approval path.

## 7. Operational readiness — agents ready to work now

The short, standing answer to "can an agent start real work on this repo
right now, safely?" Each line points to where that's actually governed —
this section adds no new rule, it collects existing ones so a fresh session
doesn't have to piece them together.

- **Role clarity** — who does what: §2 above (Chief) and §4 Role map (Chief,
  Claude Code, CodeRabbit, GPT-5-mini/Kimi/DeepSeek, Ollama); full agent
  definitions (Planner, Build, Research, Content, Reliability — reserved) in
  `docs/AGENT_RUNBOOK.md`. No "Scout" or other role exists in this repo's
  governance beyond those six — don't assume one.
- **Tool authorization** — what an agent may actually touch:
  `docs/TOOL_CATALOG.md` (the record) plus `docs/AGENT_TOOL_LANES.md` (the
  Claude Desktop/Code tool mapping and Tool Use Contract). A tool being
  connected is never authorization by itself.
- **Model routing status** — which AI models are actually reachable, and
  how: `docs/AGENT_CAPABILITIES_SUMMARY.md` for the fast, citable
  Verified/Partially-wired/Manual table; §3 above for the full reasoning.
- **Approval boundaries** — what needs a cleared `ApprovalCard`: each
  agent's "Requires Chief approval" list in `docs/AGENT_RUNBOOK.md`; Chief
  never bypasses one (§2 above, Rules).
- **Verification standard** — "Verified" means citable in repo code, config,
  env, or docs — never asserted from memory. Full label set (Verified /
  Partially wired / Manual / External / Proposed / Placeholder):
  `docs/AGENT_CAPABILITIES_SUMMARY.md` § The verification standard.
- **Expected work pattern** — small, reversible slices; inspect only the
  files a task actually needs; run local checks and report the real result;
  commit, push, or open a PR only when explicitly instructed for that task.
  Full checklist: `docs/AGENT_RUNBOOK.md` § Build Agent → Operating
  checklist.
- **Chief as front door** — every agent's request reaches David only through
  a Chief `ApprovalCard` (§2 above); no agent asks him directly, in any
  form, at any point.

If any of the above looks unmet for a specific task, that's a real gap to
flag to David, not something to route around.

## See also

- `docs/AGENT_RUNBOOK.md` — the operating contract (Common Principles, Chief
  Intake Rule, § Chief, § Chief AI Fallback Routing, § Build Agent, Change
  Control).
- `docs/TOOL_CATALOG.md` — machine-readable tool records (`claude-code`,
  `azure-ai-foundry`, `ollama-local`, `continue-dev`, and the free-tier rows)
  — the authoritative record; this doc's §3/§4 only reason about it.
- `docs/AGENT_CAPABILITIES_SUMMARY.md` — the fast, citable Verified /
  Partially wired / Manual / External / Proposed / Placeholder table for
  "are we wired for X?" — start there before re-deriving an answer from §3.
- `docs/AGENT_TOOL_LANES.md` — the Tool Use Contract for Claude
  Desktop/Code-connected tools.
- `docs/RESEARCH_TOOL_SETUP.md` — the manual-vs-agent-usable distinction for
  research provider keys.
- `knowledge/reference/tool-fallbacks.md` — fallback chains and best-use
  guidance.
- `docs/prompts/` — the copy-paste prompt catalog this doc's routing examples
  reference.
