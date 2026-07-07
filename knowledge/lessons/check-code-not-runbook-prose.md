---
title: Check actual code state, not just runbook prose, before referencing a gate
type: lesson
status: active
confidence: medium
source_workflow: ad hoc card creation (Vercel Preview secret-scope card, PR #78)
source_agent: Chief
category: failure-pattern
related_pages: [chief-approvals, tool-catalog]
related_prs: [78]
last_reviewed: 2026-07-04
---

## Rule

When drafting a card/request that references an indexed or enumerated gate (e.g.
`APPROVAL_GATES.build[n]`), check the actual array/enum in code first — don't draft
against the runbook's prose description of what the gate list "should" contain.

## Why

`docs/AGENT_RUNBOOK.md`'s prose already documented a 4th `BuildApprovalGate`, but the
actual `APPROVAL_GATES.build` array in code only had 3 items at the time. An early
draft referenced `APPROVAL_GATES.build[3]` — out of bounds — which would have rendered
the card's title as "Build: undefined." Caught by review before shipping, not by the
runtime. Docs and code can drift out of sync even within the same repo/session.

## Apply when

Drafting anything that indexes into a gate list, enum, or similarly enumerated
structure that's also described in prose somewhere.

## Avoid when

n/a — this describes a failure to avoid, not a pattern to apply.

## Check first

`grep`/read the actual `APPROVAL_GATES.*` array in `agentApprovalGates.ts` before
referencing an index into it. If code and prose are known to be out of sync (see
`decisions/agent-runbook-adoption.md`), prefer a literal string match to the gate's
exact text over an index.

---

Review after `decisions/agent-runbook-adoption.md` resolves — once
`APPROVAL_GATES.build` gets its real 4th entry, this specific failure mode should stop
being possible, and this lesson should be re-checked for continued relevance.
