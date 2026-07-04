---
title: True Crew Dashboard
type: project
status: active
confidence: high
last_reviewed: 2026-07-04
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals, dashboard-audit-july-2026, second-brain-setup]
related_prs: []
related_cards: []
---

# True Crew Dashboard

## Goal

A SaaS command center for operations/maintenance teams — the supervisor/operator
workflow (Today → Operations → Builds/Repair → Monitor → Customers → Review) on a
stack of Vercel (SPA + serverless `/api`), Supabase Postgres, GitHub webhooks, and
Obsidian (knowledge/logging). Built for a solo founder shipping fast and practically.

## Current status

Actively developed via an agent-mediated workflow: Planner/Build/Research/Content
agents do the work, Chief routes anything state-changing through an `ApprovalCard`,
David approves/declines. This pattern (`concepts/chief-approvals.md`) has been proven
across dozens of real PRs this session — real GitHub merges/closes, a real Vercel
read-only status check, and now this knowledge base itself.

Recent real threads, all live at once:
- **Chief Approval Panel** — structured cards with checklists/recommendations/source
  badges, shipped incrementally across PRs #64/#66/#67/#68 (merged) plus #69/#70/#71
  (still open).
- **Dashboard maintenance** — a July 2026 audit and three resulting fixes, all merged
  (see `projects/dashboard-audit-july-2026.md`).
- **Auth fix duplication** — two PRs (#57, #58) fixing the same bug, blocked on a
  secret-rotation confirmation that's still outstanding (see
  `decisions/auth-fix-secret-rotation.md`).
- **Vercel Preview secret scope** — an open question from a real read-only status
  check (see `decisions/vercel-preview-secret-scope.md`).
- **Second Brain / knowledge base** — this vault itself (see
  `projects/second-brain-setup.md`).

## Key milestones / timeline

- 2026-07-01 — Approval Status Dashboard shipped (PR #51); stale-pending badge shipped
  (PR #62).
- 2026-07-04 — Chief Approval Panel pattern established (PR #64, #66); agent approval
  gates standardized for all four agents (PR #67, #68); Agent Runbook drafted (PR #71,
  still open); dashboard audit run, three maintenance PRs opened and merged (#75/#76/#77
  via bundled card #79); Vercel read-only status check run, secret-scope card opened
  (#78); Second Brain starter vault created (this project).

## Open items

- PRs #69, #70, #71 (runbook-adjacent) still open/unmerged; #71 in particular is now
  stale relative to `main` on unrelated files (see `decisions/agent-runbook-adoption.md`).
- Secret-rotation confirmation for the #57/#58 auth fix — blocking, unresolved, only
  David can clear it.
- Vercel Preview secret-scope decision (#78) — pending.
- PR #79 (the dashboard-maintenance card's own source file) still open even though its
  underlying decision (approve all three PRs) is resolved.
- Larger audit findings deliberately deferred: mobile Chief-panel/sidebar overlap,
  oversized `chiefLiveContext.ts`/`ChiefPanel.tsx`, a spacing-token scale.

## Related

- Pages: [chief-approvals](../concepts/chief-approvals.md), [dashboard-audit-july-2026](dashboard-audit-july-2026.md), [second-brain-setup](second-brain-setup.md)
- PRs: #51, #62, #64, #66, #67, #68, #69, #70, #71, #75, #76, #77, #78, #79
- Decisions: [agent-runbook-adoption](../decisions/agent-runbook-adoption.md), [dashboard-maintenance-bundle](../decisions/dashboard-maintenance-bundle.md), [vercel-preview-secret-scope](../decisions/vercel-preview-secret-scope.md), [auth-fix-secret-rotation](../decisions/auth-fix-secret-rotation.md)
