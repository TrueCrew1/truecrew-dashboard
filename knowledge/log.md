# Knowledge Base Log

Append-only. One line per create/update, oldest first. Format:
`{{date}} — {{action}} — {{page}} — {{one-line reason/source}}`

Full session narrative lives in the Obsidian Build Log — this is the vault's own
lightweight ledger, not a duplicate of it.

---

## 2026-07-04 — Second Brain Starter Pass (initial)

- 2026-07-04 — created — `README.md`, `index.md`, `log.md` — vault skeleton.
- 2026-07-04 — created — `templates/concept-template.md`, `templates/project-template.md`, `templates/decision-template.md`, `templates/source-template.md` — starter templates.
- 2026-07-04 — created — `inbox/README.md` — placeholder so the empty folder is tracked.
- 2026-07-04 — created — `sources/pr-71-agent-runbook.md` — from PR #71 + Build Log entries on the Agent Runbook.
- 2026-07-04 — created — `sources/pr-75-knowledgepage-fix.md` — from PR #75 (dashboard audit).
- 2026-07-04 — created — `sources/pr-76-dead-code-cleanup.md` — from PR #76 (dashboard audit).
- 2026-07-04 — created — `sources/pr-77-datacontext-memo-fix.md` — from PR #77 (dashboard audit).
- 2026-07-04 — created — `sources/pr-79-dashboard-maintenance-bundle-card.md` — from PR #79 and the Build Log's bundle-card entries.
- 2026-07-04 — created — `sources/pr-57-58-duplicate-auth-fix.md` — from PR #57/#58 and their Build Log analysis entries.
- 2026-07-04 — created — `sources/pr-78-vercel-preview-secret-scope-card.md` — from PR #78 and its Build Log entry.
- 2026-07-04 — created — `sources/vercel-status-check-experiment.md` — from the real read-only Vercel MCP check run this session.
- 2026-07-04 — created — `sources/approval-load-runbook-section.md` — from `docs/AGENT_RUNBOOK.md` § Approval Load.
- 2026-07-04 — created — `concepts/approval-load.md` — synthesized from the Approval Load source note and its real applications this session.
- 2026-07-04 — created — `concepts/chief-approvals.md` — synthesized from the runbook and `agentApprovalGates.ts`.
- 2026-07-04 — created — `concepts/dashboard-maintenance.md` — synthesized from PRs #75/#76/#77 and the audit project page.
- 2026-07-04 — created — `concepts/vercel-status-checks.md` — synthesized from the Vercel status-check experiment source note.
- 2026-07-04 — created — `concepts/tool-catalog.md` — synthesized from the runbook's Tool Catalog and External Services Tool Catalog sections.
- 2026-07-04 — created — `projects/truecrew-dashboard.md` — umbrella project page for the whole dashboard effort.
- 2026-07-04 — created — `projects/dashboard-audit-july-2026.md` — project page for the July 2026 audit.
- 2026-07-04 — created — `projects/second-brain-setup.md` — project page for this vault itself.
- 2026-07-04 — created — `decisions/dashboard-maintenance-bundle.md` — status: approved.
- 2026-07-04 — created — `decisions/vercel-preview-secret-scope.md` — status: pending.
- 2026-07-04 — created — `decisions/auth-fix-secret-rotation.md` — status: pending.
- 2026-07-04 — created — `decisions/agent-runbook-adoption.md` — status: pending.
- 2026-07-04 — updated — `index.md` — linked all pages created in this pass.
- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` — added the Second Brain Starter Pass workflow and Knowledge Maintenance operating-rules section (not a `knowledge/` page itself, logged here since it governs this vault).

---

## 2026-07-04 — Governance pass (caps, priority order, safeguards)

Triggered by explicit request, not by new dashboard/governance work — checked
`gh pr list` and the branch's git log first; nothing had landed since the initial
pass, so this run added rules rather than ingesting new material.

- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` § Second Brain Starter Pass — added
  "Scope limits (first month)": hard caps (concepts ≤10, projects ≤5, decisions ≤15,
  sources ≤50), a 4-tier priority order, the "3–6 month" test, and a run-frequency
  rule (explicit ask or notable work only, no timer).
- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` § Knowledge Maintenance — added page
  quality rules and three named safeguards (no orphaned pages, no duplicate topics,
  no uncontrolled renaming), plus a tightened logging-discipline rule.
- 2026-07-04 — created — `sources/second-brain-governance-rules.md` — source note for
  this rule change itself.
- 2026-07-04 — created — `concepts/second-brain-workflow.md` — durable-pattern page
  for the vault's own governance (tier-2 priority: "Second Brain workflow itself").
- 2026-07-04 — updated — `projects/second-brain-setup.md` — new milestone entry,
  updated open items and current-count headroom.
- 2026-07-04 — updated — `index.md` — added a "Vault size (at a glance)" table,
  linked the new concept page, and converted the Sources section from a folder
  pointer into direct links to all 10 source notes (closing a "no orphaned pages"
  gap that existed since the first pass).
- 2026-07-04 — **deferred (duplicate-topic decision, not a cap):** a standalone
  `concepts/agent-runbook.md` was considered and rejected — `concepts/chief-approvals.md`
  already covers the runbook's approval-routing content; a separate page would
  restate it under a different name. No page created.
- 2026-07-04 — **deferred (below the 3–6 month bar):** the 7 remaining dashboard-audit
  findings (beyond PRs #75/#76/#77) still don't have their own source notes — noted
  again as a candidate for a future pass, not created now.
- **Counts after this pass:** concepts 6/10, projects 3/5, decisions 4/15,
  sources 10/50. No caps were hit or approached.
