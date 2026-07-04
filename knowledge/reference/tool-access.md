---
title: Tool Access Quick Reference
type: reference
status: active
confidence: high
last_reviewed: 2026-07-04
related_pages: [tool-catalog]
related_prs: [71]
---

# Tool Access Quick Reference

Stable lookup table — who may touch what, and how. Distilled from
`docs/AGENT_RUNBOOK.md` § Tool Catalog / External Services Tool Catalog and
`concepts/tool-catalog.md` (read those for the reasoning; this page is for a fast
lookup during a real run, not narrative).

**Access levels:** READ-ONLY (look, never change) · PROPOSE-ONLY (draft, human
executes) · EXECUTE-WITH-APPROVAL (agent executes, only after a cleared card).

| Tool | Agent | Access | Gate |
|---|---|---|---|
| GitHub (repo, PRs, issues) | Build | EXECUTE-WITH-APPROVAL for merge/close; READ-ONLY for browsing | Any merge/close needs a cleared card |
| CI status (Actions, Vercel preview checks) | Build | READ-ONLY | none |
| Obsidian Build Log / Agent Log | Chief | READ/WRITE | none (logging is Chief's own job) |
| Obsidian roadmap/decision docs | Planner, Chief | PROPOSE-ONLY for new decisions; direct edit only to sync an already-established fact | `PlannerApprovalRequest` for a genuine change |
| Repo docs (`docs/*.md`, `README.md`) | Content, Build | PROPOSE-ONLY via PR | external-facing docs get their own single-issue card |
| Vercel — deploy status, preview URLs | Build | READ-ONLY | none |
| Vercel — env vars, production config | — | HUMAN-ONLY | — |
| Supabase — schema/migrations (via code) | Build | PROPOSE-ONLY | Build's "database or schema migration" gate |
| Supabase — console/dashboard (billing, keys) | — | HUMAN-ONLY | — |
| Sentry | Build, Research | READ-ONLY | none |
| Cursor (drafts diffs/PRs) | Build | PROPOSE-ONLY | merge/close still goes through Build's normal gate |
| Secrets stores (`INTERNAL_API_SECRET`, etc.) | — | HUMAN-ONLY | never agent-readable or writable |
| Gmail, Zapier, ticketing/CRM/calendar | — | HUMAN-ONLY | no established use case; too sensitive |

**Default when a tool isn't listed here:** HUMAN-ONLY, least privilege, until
explicitly classified in `docs/AGENT_RUNBOOK.md` § Tool Catalog.

## Related

- Concept: [tool-catalog](../concepts/tool-catalog.md) (the full reasoning and
  External Services table)
- Runbook: `docs/AGENT_RUNBOOK.md` § Tool Catalog, § External Services Tool Catalog
