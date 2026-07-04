---
title: Tool Catalog (agent tool-access governance)
type: concept
status: tentative
confidence: medium
last_reviewed: 2026-07-04
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals, vercel-status-checks]
related_prs: [71]
related_cards: []
---

# Tool Catalog (agent tool-access governance)

## Summary

A first-pass inventory of every tool in David's actual stack, classified for whether
and how an agent may use it — planning and governance only. As of this note, no agent
has actually been wired into any tool as its own automated integration; every real
tool call this session was made by the Chief-persona conversation directly, following
the catalog's classifications by hand.

## What works

- Access levels, least to most permissive: **READ-ONLY** (look, never change),
  **PROPOSE-ONLY** (agent drafts, human executes), **EXECUTE-WITH-APPROVAL** (agent
  executes, only after a cleared card). Default is least privilege — an unconfirmed
  or unclear-blast-radius tool defaults to **HUMAN-ONLY**.
- Full classification lives in `docs/AGENT_RUNBOOK.md` § Tool Catalog / § External
  Services Tool Catalog; the fast-lookup version is `reference/tool-access.md` — use
  that during a real run instead of re-deriving from the narrative.
- Top priority candidates for real integration (ranked by proven/low-risk): GitHub
  PRs/CI, Obsidian Build Log, repo docs, Sentry (read-only, not yet used), Vercel
  deploy status (read-only, exercised for real — see `concepts/vercel-status-checks.md`).

## What to check first

- `reference/tool-access.md` before calling any tool not obviously already in use —
  it's the fast lookup; this page is the reasoning behind it.
- Whether a tool's real use is confirmed before treating it as anything other than
  HUMAN-ONLY.

## Open questions

- Explicitly a first pass — several categories (ticketing, CRM, calendar) are
  placeholders with "none confirmed in use," kept HUMAN-ONLY by default rather than
  actively evaluated.
- This whole classification lives in the still-unmerged `docs/AGENT_RUNBOOK.md` — see
  `decisions/agent-runbook-adoption.md`. Status is `tentative` (not `active`) for this
  reason: the classification is real and followed in practice, but hasn't yet been
  through a Memory Review Pass to confirm it still holds after any tooling changes.

## Related

- Decisions: [agent-runbook-adoption](../decisions/agent-runbook-adoption.md)
- Sources: none yet — the runbook's own Tool Catalog section is the primary source
- Lessons: [check-code-not-runbook-prose](../lessons/check-code-not-runbook-prose.md) (same code/docs drift risk applies to gate classifications generally)
