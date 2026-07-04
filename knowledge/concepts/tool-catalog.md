---
title: Tool Catalog (agent tool-access governance)
type: concept
status: established
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals, vercel-status-checks]
related_prs: [71]
related_cards: []
---

# Tool Catalog (agent tool-access governance)

## Summary

A first-pass inventory of every tool in David's actual stack, classified for whether
and how an agent may use it — planning and governance only. As of this note, **no
agent has actually been wired into any tool** as its own automated integration; every
real tool call this session was still made by the Chief-persona conversation directly,
following the catalog's classifications by hand.

## Established facts

- Access levels, from least to most permissive: **READ-ONLY** (look, never change),
  **PROPOSE-ONLY** (agent drafts, a human executes), **EXECUTE-WITH-APPROVAL** (agent
  executes, but only after a cleared `ApprovalCard`).
- Default is least privilege — an unconfirmed or unclear-blast-radius tool defaults to
  **HUMAN-ONLY**.
- Categories covered in `docs/AGENT_RUNBOOK.md` § Tool Catalog: Code & repo tools,
  Docs & notes, Dashboards & analytics, External SaaS, Auth/infra — plus a separate
  **External Services Tool Catalog** covering David's actual AI/dev subscriptions
  (Claude Pro, Perplexity Pro, Cursor, Vercel, Supabase, free ChatGPT/Kimi/DeepSeek/
  Gemini, free Copilot), sourced from `CLAUDE.md`'s own tool-routing section.
- Top 5 priority candidates for real integration (ranked by how proven/low-risk they
  already are): GitHub PRs/CI (Build, execute-with-approval for merge/close), Obsidian
  Build Log (Chief, read/write, no gate for logging itself), repo docs (Content,
  propose-only), Sentry (Build/Research, read-only, not yet used), Vercel deploy status
  (Build, read-only — since exercised for real, see
  `concepts/vercel-status-checks.md`).
- Nearly all of the "External Services" list are consumer chat subscriptions with no
  programmatic API today — classified AGENT-ELIGIBLE "in principle," not currently
  wireable. Vercel, Supabase, and Cursor are the real exceptions (genuine CLI/API
  surfaces already in use in this repo's history).

## Open questions / inference

- The catalog is explicitly a first pass — several categories (ticketing, CRM,
  calendar) are placeholders with "none confirmed in use," kept HUMAN-ONLY by default
  rather than actively evaluated.
- This whole section lives in the still-unmerged `docs/AGENT_RUNBOOK.md` (PR #71) — see
  `decisions/agent-runbook-adoption.md`.

## Related

- Pages: [chief-approvals](chief-approvals.md), [vercel-status-checks](vercel-status-checks.md)
- PRs: #71
- Decisions: [agent-runbook-adoption](../decisions/agent-runbook-adoption.md)
