# Chief work truth — operator path

How Chief decides what to surface as real work vs status vs stub/demo.

## Operator mode (default)

Chief is a foreman panel for **actual work**, not a demo board.

Allowed on the Approvals tab:
1. **Executable** — approve launches a real Research mission (known `missionKind` + entity id).
2. **Grounded** — backed by live ops state; needs judgment; **no auto-run yet** (shown in a separate “Needs judgment” lane).

Hidden by default:
- **Stub / demo** — `MOCK_PR_APPROVAL_CARDS`, `EXAMPLE_*` agent cards, historical `REPO_CHANGE_APPROVAL_CARDS` seeds.
- **Informational** command answers — never become approval cards.

Enable stubs only with explicit opt-in: `VITE_SHOW_CHIEF_STUB_APPROVALS=true`.

## Truth labels (`workTruth`)

| Value | Meaning |
|-------|---------|
| `executable` | Real state + approve runs an existing mission runner |
| `grounded` | Real state + decision needed; no mission runner wired |
| `informational` | Status / advice only — not an approval |
| `stub` | Demo / example / stale seed — not for operators |

Defined in `lib/chief/workTruth.ts`. Guard: `guardCommandResultWorkTruth()` strips fake `approvalNeeded` flags.

## What launches real work today

| Trigger | Mission | Path |
|---------|---------|------|
| Command: “Propose a postmortem…” | `research:monitor-incident-postmortem` | Approve → `executeMonitorIncidentPostmortemMission` |
| Command: “Propose a project summary handoff…” | `research:project-summary-handoff` | Approve → `executeProjectSummaryHandoffMission` |
| Derived: active Sev 1–2 incident without repair | same postmortem mission | Auto-card from `deriveApprovalCandidates` |
| Derived: In Progress / Review build workflow | same handoff mission | Auto-card from `deriveApprovalCandidates` |

## Grounded but not executable yet

- Blocked build gate overrides (`apr-gate-*`)
- Held deploy releases (`apr-deploy-*`)
- Live monitor platform degradation cards

Approve records the decision only — operator still acts in Builds / Review / Monitor.

## Command intents that stay informational

Risk/status, blockers list, approvals list, missing context, incident status, alerts, knowledge search, AI fallback answers. These **do not** enqueue approval cards.

## Files

| Area | Files |
|------|--------|
| Truth helpers | `lib/chief/workTruth.ts` |
| Command router | `lib/chief/resolveCommand.ts`, `lib/chief/runChiefCommand.ts` |
| Approval enqueue guard | `src/components/chief/chiefMock.ts` (`buildApprovalFromResponse`) |
| Derived candidates (narrowed) | `src/components/chief/chiefLiveContext.ts` |
| Seed gating | `src/components/chief/chiefApprovalSeeds.ts`, `ChiefApprovalsContext.tsx` |
| Stub catalog | `agentApprovalGates.ts` (`STUB_AGENT_APPROVAL_CARDS`), `chiefApprovalCardMocks.ts` |
| UI lanes + badges | `ApprovalBoard.tsx`, `ChiefHomePanel.tsx`, `ChiefPanel.tsx`, `chiefApproval.ts` |

## Related

- Command surface: `docs/CHIEF_COMMAND_SURFACE.md`
- Mission runners: `lib/missions/types.ts`
