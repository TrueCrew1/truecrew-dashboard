---
title: Transactional email vendor for notification hooks — current state
type: source
status: raw
created: 2026-07-14T03:55:25.257Z
updated: 2026-07-14T03:55:25.257Z
work_story_id: story-notification-vendor
related_pages: []
related_prs: []
related_cards: []
---

# Transactional email vendor for notification hooks — current state

## Origin

Chief Research queue request `req-notification-vendor` — raised because ChiefPanel's notification hooks are stubbed with no vendor wired in.

## Raw summary

This is a structural placeholder, not vendor research: it exists to prove the Work Story model is reusable across more than one scenario, not to claim a vendor decision has been made. No vendor names, pricing, or benchmarks are asserted anywhere in this note — that comparison is exactly what a real Research agent pass still needs to produce.

## Extracted facts

- ChiefPanel.tsx's handleSubmit has an extension-point comment noting a future "card created" notification hook alongside real approval sources, but no outbound-email vendor call exists anywhere in the repo yet.
- No workflowType:"build" task in mockData.ts represents this work — unlike the Billing API rate limiter story, this scenario has no live Board card or Planner checklist yet.
- Chief's Work Story panel (Agents tab) marks this story "Structured" rather than "Live" for exactly this reason.

## Processed into

Not yet synthesized into a concept/project/decision page. Next step: A short vendor comparison filed as a knowledge/sources/ finding.
