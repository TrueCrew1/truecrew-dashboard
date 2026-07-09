# Chief Voice + Text Command Intake — Spec

Durable design reference for how voice input, if implemented, enters Chief's existing
command system. This is a spec for future implementation — it changes no code, adds no
UI, and wires no speech engine.

**Sits under, does not replace:** `CLAUDE.md` (product tone, coding preferences),
`docs/AGENT_WORKFLOW.md` (agent vs. approver roles), `docs/AGENT_APPROVAL_LOOPS.md`
(system law, shared approval path), and `docs/AGENT_RUNBOOK.md` (§ Chief — approvals
router, never auto-executes). Where this spec is silent, those docs govern. Where a
request is agent-authored rather than operator-spoken/typed, see
`docs/RESEARCH_AGENT_PACKET_SPEC.md` and `docs/BUILDER_AGENT_PACKET_SPEC.md` for the
`AgentPacket` path — a related but separate intake, not superseded by this one.

## Purpose

Chief is the single "speaking and listening" foreman — one command surface, one
approval surface, no matter how a word reaches it. Today that surface is text: the
operator types into the Chief command input on the dashboard
(`ChiefHomePanel.tsx`/`ChiefPanel.tsx`), and `resolveChiefCommand()` in
`chiefLiveContext.ts` turns it into a `ChiefResponse`.

Voice is not a new agent, not a new router, and not a new decision-maker. It is a
future input mode that produces the same text a typed command already produces, then
hands that text to the exact router already in place. If a future voice slice works,
an operator should not be able to tell — from Chief's behavior, approvals, or
logs — whether a given command was typed or spoken.

## Inputs

**Text — real today:**
- Dashboard Chief panels: the command input in `ChiefHomePanel.tsx` (Today page) and
  `ChiefPanel.tsx` (sidebar), both calling the same `resolveChiefCommand()`.
- Slack: **not wired today.** `docs/TOOL_CATALOG.md` lists Slack as `status:
  future-integration`, `owner_agent: — (human-only)`, "no confirmed agent use case
  yet." This spec does not change that — Slack is named here only as a possible
  future text channel, not a current one. If it's ever wired, it must feed the same
  command router this spec describes, not a parallel one.

**Voice — future, not yet implemented:**
- A future microphone/speech-to-text step that produces a plain text string, handed to
  the same command entry point text commands use today (whatever calls
  `resolveChiefCommand()` — a dashboard hook or an equivalent intake function, TBD by
  the implementing slice, not specified here).
- No new command vocabulary, no new response shape, no new state. The output of
  transcription is a string; from that point on it is indistinguishable from a typed
  command.

**No special path.** Voice → transcribed text → existing command router. There is no
"voice mode" branch inside Chief's logic, no separate response type for spoken
commands, and no voice-only capability that text commands lack (or vice versa).

## Core rules

Every voice interaction, once transcribed, becomes a normal text command handled by
the existing Chief command router (`resolveChiefCommand()` today; any future
successor must preserve this — one router, one behavior, regardless of input mode).

**Voice/text can:**
- Request situation briefs — platform health, incidents, approvals summary (the
  existing risk/status, incident, and approvals branches in `resolveChiefCommand()`).
- Ask for descriptions of current queues or incidents (existing `resolveBlocked()`,
  `resolveIncidents()`, `resolveApprovals()` branches, or equivalents).
- Request that Chief **propose** agent work — e.g. "draft a Research packet on
  incident X." This produces a proposal into the shared queue via the existing
  `response.approvalNeeded` → `buildApprovalFromResponse()` →
  `addCommandApproval()` path (`ChiefApprovalsContext`) — the same mechanism a typed
  command already uses today to land a pending card. It does not itself create an
  `AgentPacket`; a command asking Chief to "draft a Research packet" results in a
  command-originated `ApprovalProposal` requesting that work, not a
  `AgentPacket<ResearchApprovalRequest>` — those are two different origins for the
  same shared queue (see Research/Builder packet specs), and this spec does not merge
  them.

**Voice/text cannot:**
- Directly approve, merge, deploy, or change infrastructure. No spoken or typed phrase
  executes anything by itself.
- Bypass Chief's approval cards or the operator's own decision. "Approve the top
  card" said out loud is not a decision — see Approval constraints below.

## Approval constraints

All approvals still occur via Chief cards in the dashboard (Slack UI, if ever wired,
would be an additional card surface, not a second approval model), with explicit
**Approve** / **Send back** / **Reject** actions — same three actions
`AGENT_APPROVAL_LOOPS.md` and `AGENT_RUNBOOK.md` already define, unchanged by voice.

Voice may notify or summarize pending approvals ("You have 3 pending approvals," in
response to a spoken situation-brief request) — that is a `resolveApprovals()`-style
read, identical to what a typed "show approvals I need to review" already returns
today. The decision itself must still be taken via the existing UI (Approve/Send
back/Reject buttons on a card) — voice does not add a spoken "approve" action.

Three request shapes must stay clearly separate, in code and in operator-facing
language, so "I said something" is never confused with "I decided something":

1. **Command to propose work** — e.g. "draft a Research packet on incident X." Result:
   a new pending item enters the shared queue (command-originated `ApprovalProposal`
   today; a future agent-originated `AgentPacket` per the Research/Builder specs).
   Nothing executes. Nothing is decided.
2. **Command to show current approvals** — e.g. "list pending approvals," "what's
   overdue." Result: a read-only summary, no queue mutation.
3. **Human decision on a specific card** — Approve/Send back/Reject, taken only
   through the Chief → Approvals UI (or an equivalent Slack card action, if ever
   built) — never inferred from a spoken or typed sentence alone.

## Observability

Uses `chiefLog`/`chiefGovernanceEvents` exactly as they exist today
(`src/components/chief/chiefLog.ts`, `chiefGovernanceEvents.ts`) — this spec does not
add new infrastructure, only names which existing-shaped events a future
implementation should emit at each point:

| Moment | Event | Notes |
|---|---|---|
| A voice or text command reaches the router | `command_received` | Not in `ChiefGovernanceEventType` today (`"packet_created" \| "card_created" \| "card_decided"`). Adding it — and tagging voice vs. text as event `detail`, not a new type per mode — is a small, additive future change to `chiefGovernanceEvents.ts`, not something this spec performs. |
| A situation-brief/status/incident/approvals-summary read resolves | `situation_brief_requested` | Same status — not an existing type; a future additive change, logged the same non-blocking way as the three that already exist. |
| Chief decides a command should become a proposed packet | `agent_packet_proposed` | For the real `AgentPacket` path (Research/Builder specs), this is effectively today's `packet_created`, already wired inside `createAgentPacket()`. For the command-originated `ApprovalProposal` path (`buildApprovalFromResponse`/`addCommandApproval`), no packet exists — logging that moment under a `packet_created`-shaped event would be inaccurate; if this path needs its own event, it needs its own honestly-named type, not a reuse of `packet_created`. |
| An operator decision resolves a card sourced from a voice/text-originated proposal | `approval_decision_recorded` | Maps to today's `card_decided`, already defined and already wired into `chiefLog.cardDecided()` — not yet called from `ChiefApprovalsContext.recordDecision()` (see Research/Builder specs' Logging sections for the same open wiring gap). Voice does not change this — it's the same gap regardless of input mode. |

**Non-negotiable, restated from `chiefGovernanceEvents.ts`'s own contract:**
- Every event above is observability only — a record that something happened, never a
  decision, approval, or trigger for downstream work.
- No event automatically executes, queues, or advances anything. A logged
  `command_received` does not itself create a proposal; a logged
  `agent_packet_proposed` does not itself notify or auto-approve.
- Emit failures must be swallowed — logging must never block a command response, a
  packet, a card, or an approval decision, exactly as `emitChiefGovernanceEvent`
  already guarantees for the three event types that exist today.

## UX guidelines (lightweight)

**Text commands** stay simple, operator-friendly phrases — the same style
`resolveChiefCommand()` already matches against: "What's platform health?", "List
pending approvals," "Summarize incidents," "What's blocked?"

**Voice** uses the same phrases as text — no separate voice vocabulary to learn —
potentially preceded by a wake phrase (e.g., "Chief, what's blocked?"). The wake-word
detection/activation mechanism itself is future work (see below); this spec only
establishes that whatever a wake phrase triggers, it hands the remaining words to the
same router as a typed command would receive verbatim.

This spec does not add new UI. No mic button, no waveform, no voice-specific screen —
it defines behavior for a future slice to implement against, not a surface for the
operator to see today.

## Constraints

Restated from `CLAUDE.md`, `docs/AGENT_WORKFLOW.md`, `docs/AGENT_APPROVAL_LOOPS.md`,
and `docs/AGENT_RUNBOOK.md` — non-negotiable for any implementation of this spec, not
just for this document:

- **Chief is the only approval surface.** Voice does not create a second surface, a
  side channel, or a spoken "yes" that counts as a decision.
- **Human-in-the-loop, always.** A command producing a proposal, and an operator
  deciding a card, remain two separate steps — voice collapsing them into one
  utterance is explicitly out of bounds.
- **Single shared queue; `AgentPacket` is pre-queue only.** Whether a proposal
  originates from a typed command, a spoken command, or an agent's own packet, it
  still flows through `ChiefApprovalsContext` — never a second queue, never a
  voice-specific bypass.
- **Observability-only logging.** As above — no event is a trigger.
- **No new backend, database, API route, or dependency implied by this spec.** Any
  future ASR/TTS integration is its own explicitly-scoped decision (and, per
  `docs/TOOL_CATALOG.md`'s least-privilege default, its own tool-catalog entry) — not
  authorized by this document.
- **TypeScript strict, no new approval models.** Any future implementation extends
  `resolveChiefCommand()`/`ChiefResponse`/`ApprovalProposal` as they exist — it does
  not invent a parallel "voice approval" type or a looser-typed intake layer.

## Future work

Explicitly out of scope for this spec:

- Actual ASR/TTS wiring (speech recognition input, speech synthesis output).
- New UI components for voice (mic button, waveform, recording indicator, etc.).
- Slack or Notion broadcasting of voice-originated commands or their responses.
- Multi-turn conversational routines (follow-up questions, clarifying dialogue) —
  today's router resolves one command to one response, and this spec does not change
  that.
- Any auto-run behavior triggered by a logged event (`command_received`,
  `agent_packet_proposed`, or any other) — every event above stays observability-only
  until a separate, explicitly-approved spec says otherwise.
- The wake-phrase detection/activation mechanism itself.
- Adding `command_received`/`situation_brief_requested`/`agent_packet_proposed` to
  `ChiefGovernanceEventType`, and wiring `chiefLog.cardCreated`/`cardDecided` into
  `ChiefApprovalsContext` — small, additive future changes, not performed here.
