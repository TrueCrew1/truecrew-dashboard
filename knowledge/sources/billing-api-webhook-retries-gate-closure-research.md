---
title: Billing API webhook retries — gate-closure research
type: source
status: raw
created: 2026-07-14T04:32:52.598Z
updated: 2026-07-14T04:32:52.598Z
work_story_id: story-webhook-retries
related_pages: []
related_prs: []
related_cards: []
---

# Billing API webhook retries — gate-closure research

## Origin

Chief Research queue request `req-webhook-retries` — raised because Planner's checklist on the Build gates card (Board tab) flags task-005's one remaining gate.

## Raw summary

task-005 ("Billing API webhook retries") has 1 of 2 required gates passed (acceptance criteria written) and 1 open: "GitHub branch linked". It's linked to the Webhook Worker tool (tool-003, status: degraded) and to an open incident (inc-002, "Webhook delivery backlog" — queue depth above 5k for 45 minutes) that this build is meant to resolve.

## Extracted facts

- task-005's required gates: "Acceptance criteria written" (passed), "GitHub branch linked" (not passed).
- task-005 is linked to tool-003 (Webhook Worker, status: degraded) and inc-002 ("Webhook delivery backlog", severity 3, status: open).
- Planner's checklist for this task (getPlannerChecklist, Board tab) currently reads: "Close: GitHub branch linked" then "Confirm evidence and hand back to Chief for approval."

## Processed into

Not yet synthesized into a concept/project/decision page. Next step: A findings note listing the retry/backoff parameters (max attempts, backoff curve, dead-letter handling) that need to be decided before the branch can be opened.
