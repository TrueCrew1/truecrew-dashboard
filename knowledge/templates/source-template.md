---
title: 
type: source
status: raw
created: 
updated: 
work_story_id: 
verification: provisional
related_pages: []
related_prs: []
related_cards: []
---

# {Title}

*Optional: set `work_story_id` above to the matching `WorkStoryDefinition.id`
(`src/lib/chief/workStories.ts`) when this note files a finding for a specific
Work Story / research request — omit it if this note isn't tied to one.*

*Set `verification` above per the Inline Verification Standard
(`docs/AGENT_RUNBOOK.md` § Knowledge Precedence & Task-Time Retrieval):
`verified` (checked directly against current repo/runtime state while filing
this note), `cited` (backed by a specific named source, not independently
re-checked), or `provisional` (anything else — an assumption, an unfiled-grade
claim). Only `verified`/`cited` notes are treated as task-time-retrievable,
authoritative research for Chief/Build (see
`src/lib/knowledge/taskTimeResearch.ts`); a missing or unrecognized value
defaults to `provisional` — the safe default, not a placeholder to leave
unset.*

## Origin

Where this came from — a specific PR number, Build Log entry (with date/heading), or
Agent Runbook section. Link it directly.

## Raw summary

What the artifact actually says, close to verbatim — don't editorialize here. This is
the "preserve uncertainty and raw facts" layer.

## Extracted facts

The specific, checkable claims worth carrying forward (dates, PR numbers, verified
statuses).

## Processed into

Which `concepts/`, `projects/`, or `decisions/` pages this source note fed into, if any
yet. Leave empty if this source hasn't been synthesized yet — that's a normal, valid
state, not a gap to rush.
