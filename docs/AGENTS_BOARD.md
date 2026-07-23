# Chief → Agents Tab

What each agent row on Chief's Agents tab shows, and where the data comes from.
A green **live** badge means the row is derived from real app data; a gray
**mock** badge means it's a hand-written placeholder.

> **UI labels ≠ prompt taxonomy (2026-07-23).** Promptable lanes are only
> Chief · Research · Librarian · Repo · Knowledge
> ([AGENT_SYSTEM.md](./AGENT_SYSTEM.md)). Rows such as Build / Roadmap /
> Workflow Gate / Marketer below are **product board labels**, not system prompts.
> “Build Agent” on this board maps to the **Repo** lane.

| Agent | Status | Data source |
|---|---|---|
| Build Agent (shown as **Repo**) | live | Tasks with `workflowType === "build"` — display label Repo per AGENT_SYSTEM |
| Workflow Gate Agent | live | Non-build, non-decision tasks with an open gate checklist |
| Research Agent | live | Active/resolved incidents |
| Librarian Agent | live | Tasks plus indexed Obsidian artifacts (filed vs. pending) |
| Roadmap Agent | live | Tasks with `workflowType === "decision"` |
| Marketer Agent | mock | No real signal exists yet — no marketing/content workflow type in the data model |
| Awaiting approval (all agents) | live | Pending proposals from the shared Chief Approvals queue |

Live rows map task/incident state to board status the same way for every
agent: an open required gate or a blocker → **blocked**; not yet started
(Inbox/Triage/Planned) → **queued**; done/logged/resolved → **completed**;
otherwise → **active**. Research and Librarian use their own equivalent
signal (incident status; artifact-filed state) since they don't carry a gate
checklist.

Source: `src/components/chief/chiefLiveContext.ts` (derivations),
`src/components/chief/AgentWorkBoard.tsx` (rendering + badges),
`src/components/chief/agentWorkBoardMock.ts` (remaining mock data).
