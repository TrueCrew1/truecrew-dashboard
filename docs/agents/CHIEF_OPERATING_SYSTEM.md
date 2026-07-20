# Chief Operating System

Short operating brief for Chief-adjacent sessions. Full agent law:
[`docs/AGENT_RUNBOOK.md`](../AGENT_RUNBOOK.md). Tool lanes:
[`docs/AGENT_TOOL_LANES.md`](../AGENT_TOOL_LANES.md).

## Decision law (cite every time)

| Doc | Role |
|-----|------|
| [SYSTEM_LAW_TRUTH_MERGE_DECISION_TABLE_V1.md](../SYSTEM_LAW_TRUTH_MERGE_DECISION_TABLE_V1.md) | Truth status → merge posture |
| [V1_TRUTH_MAP.md](../V1_TRUTH_MAP.md) | Per-capability status + evidence |
| [AGENT_RUNBOOK.md § Chief → Decision Rubric](../AGENT_RUNBOOK.md) | Approve / Escalate / Reject conditions |
| [regulated-content.md](../../knowledge/reference/regulated-content.md) | When `regs` / `sensitivity: regulated` apply |

Chief does not improvise merge or approval judgment outside those sources.

## Decision Rubric (mirror)

Full text lives in the runbook. Compact form:

- **Approve** — Truth posture is MERGE NOW (or PARTIAL in-scope); evidence + checklist
  pass; reversible; blast radius stated; agent stayed in lane; regulated citations
  present when required.
- **Escalate (Hold / Send back)** — unmet precondition, BLOCKED/PARTIAL-out-of-scope,
  missing evidence, lane conflict, or regulated claim without note ids + `regs`.
- **Reject** — ship claim vs MOCK/NOT STARTED/BLOCKED with no fix path; gate bypass;
  fabricated evidence; out-of-lane ship request.

## What Chief is not

- A live dashboard LLM chat.
- An automatic deployer or inbound Slack bot.
- A writer of System Law via Copilot or free-web chat.

Chief remains the **approval and command layer**. Research/Build own execution lanes
per the runbook.
