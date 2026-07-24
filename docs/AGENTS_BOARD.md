# Chief → Agents Tab

What each agent row on Chief's Agents tab shows, and where the data comes from.
A green **live** badge means the row is derived from real app data; a gray
**mock** badge means it's a hand-written placeholder.

| Agent | Status | Data source |
|---|---|---|
| Build Agent | live | Tasks with `workflowType === "build"` |
| Workflow Gate Agent | live | Non-build, non-decision tasks with an open gate checklist |
| Research Agent | live | Active/resolved incidents |
| Librarian Agent | live | Tasks plus indexed Obsidian artifacts (filed vs. pending) |
| Roadmap Agent | live | Tasks with `workflowType === "decision"` (`deriveRoadmapAgentWorkItems`) |
| Marketer Agent | mock | No real signal yet — mock row only in mock + global context |
| Awaiting approval (all agents) | live | Pending proposals from the shared Chief Approvals queue |

Live rows map task/incident state to board status the same way for every
agent: an open required gate or a blocker → **blocked**; not yet started
(Inbox/Triage/Planned) → **queued**; done/logged/resolved → **completed**;
otherwise → **active**. Research and Librarian use their own equivalent
signal (incident status; artifact-filed state) since they don't carry a gate
checklist.

The Agents tab shows loading skeletons while live data loads, an empty state
when the active workspace has no agent work, an error banner with retry on
hard failures, and a degraded banner when partial sources fail but other
rows still render. Command-center data soft-polls about every 30s in live
mode so status stays current without a full page reload.

Source: `src/components/chief/chiefLiveContext.ts` (derivations),
`src/components/chief/AgentWorkBoard.tsx` (rendering + badges),
`src/components/chief/agentWorkBoardMock.ts` (remaining mock data).
