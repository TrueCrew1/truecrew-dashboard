# Knowledge Base Index

Start here. See [README.md](README.md) for what this vault is and how it's meant to be
used.

## Vault size (at a glance)

First-month hard caps, per `docs/AGENT_RUNBOOK.md` § Second Brain Starter Pass —
enforced, not aspirational. See [concepts/second-brain-workflow.md](concepts/second-brain-workflow.md)
for the full rule set.

| Category | Count | Cap |
|---|---|---|
| Concepts | 6 | 10 |
| Projects | 3 | 5 |
| Decisions | 4 | 15 |
| Sources | 10 | 50 |
| Patterns | 6 | 10 |

## Concepts

Durable topic pages — the load-bearing ideas behind how this project runs.

- [Chief Approvals](concepts/chief-approvals.md) — the approval routing model: agents
  never ask David directly, everything becomes a card.
- [Approval Load](concepts/approval-load.md) — how Chief bundles, prioritizes, and
  defers cards to keep David's queue short without weakening any gate.
- [Dashboard Maintenance](concepts/dashboard-maintenance.md) — the category of small,
  low-risk repo upkeep that comes out of periodic audits.
- [Vercel Status Checks](concepts/vercel-status-checks.md) — the read-only pattern for
  Build checking real deploy/runtime state.
- [Tool Catalog](concepts/tool-catalog.md) — governance-level classification of every
  tool in David's stack for agent access.
- [Second Brain Workflow](concepts/second-brain-workflow.md) — how this vault itself is
  governed: caps, priority order, safeguards.

## Patterns

Reusable judgment — not activity — grouped by type. Each page is a merged log of
dated entries with next-time guidance and memory-worth tracking (`success_uses` /
`failure_uses`). See `docs/AGENT_RUNBOOK.md` § **High-Value Learning Capture**.

- [Winning Patterns](patterns/winning-patterns.md) — reliable success patterns worth
  repeating (1 entry: re-verify real state immediately before acting).
- [Failure Patterns](patterns/failure-patterns.md) — mistakes worth avoiding (1 entry:
  trusting runbook prose over actual code state when drafting a gate reference).
- [Constraints](patterns/constraints.md) — durable environment/tool limits (1 entry:
  GitHub auto-closes a PR when its stacked base branch is deleted on merge).
- [Recovery Patterns](patterns/recovery-patterns.md) — what worked after something
  went wrong (1 entry: rebase the orphaned commit onto `main` and reopen as a new PR).
- [Approval / Orchestration Patterns](patterns/approval-orchestration-patterns.md) —
  Chief's card/bundling moves (1 entry: bundle same-decision findings into one card).
- [Research Patterns](patterns/research-patterns.md) — no entry yet; Research hasn't
  run a real (non-illustrative) workflow in this session.

## Projects

Active efforts.

- [True Crew Dashboard](projects/truecrew-dashboard.md) — the umbrella project: the
  product itself and its agent-mediated workflow.
- [Dashboard Audit — July 2026](projects/dashboard-audit-july-2026.md) — the audit that
  produced PRs #75/#76/#77.
- [Second Brain Setup](projects/second-brain-setup.md) — this vault, its own project.

## Decisions

One page per meaningful decision, each marked approved / pending / declined.

- **Approved** — [Dashboard maintenance bundle](decisions/dashboard-maintenance-bundle.md)
  (PRs #75/#76/#77, merged).
- **Pending** — [Vercel Preview secret scope](decisions/vercel-preview-secret-scope.md)
  (PR #78).
- **Pending** — [Auth fix secret-rotation gate](decisions/auth-fix-secret-rotation.md)
  (PR #58).
- **Pending** — [Agent Runbook adoption](decisions/agent-runbook-adoption.md)
  (PR #71 vs. this pass's fresh copy).

## Sources

Raw-artifact notes, one per PR/runbook-section/experiment. Kept as links here (not
just a folder pointer) so every note is actually reachable from this page, per the
"no orphaned pages" safeguard.

- [PR #57 vs #58 — duplicate auth-trim fix](sources/pr-57-58-duplicate-auth-fix.md)
- [PR #71 — Agent Runbook created and installed](sources/pr-71-agent-runbook.md)
- [PR #75 — KnowledgePage table/empty-state fix](sources/pr-75-knowledgepage-fix.md)
- [PR #76 — duplicate util + dead export cleanup](sources/pr-76-dead-code-cleanup.md)
- [PR #77 — DataContext memoization fix](sources/pr-77-datacontext-memo-fix.md)
- [PR #78 — Vercel Preview secret-scope card](sources/pr-78-vercel-preview-secret-scope-card.md)
- [PR #79 — dashboard-maintenance bundle ApprovalCard](sources/pr-79-dashboard-maintenance-bundle-card.md)
- [Build ↔ Vercel read-only status-check experiment](sources/vercel-status-check-experiment.md)
- [Agent Runbook § Approval Load](sources/approval-load-runbook-section.md)
- [Second Brain governance rules added](sources/second-brain-governance-rules.md)

## Recent updates

- **2026-07-04** — High-Value Learning Capture: added the policy, six `patterns/`
  pages, a required learning schema (with confidence + memory-worth tracking), a
  "Learning capture and promotion" end step on every Agent Workflow, and memory
  governance rules (active/tentative/deprecated, never silently deleted). Seeded the
  first 5 real pattern entries (winning, failure, constraint, recovery,
  approval-orchestration) from real session history; Research patterns page notes
  honestly that no real Research workflow has run yet.
- **2026-07-04** — Governance pass: hard caps, priority hierarchy, page-quality rules,
  and three safeguards added to `docs/AGENT_RUNBOOK.md`; one new concept page
  (`second-brain-workflow`) and one source note added; no new PR/Build Log material
  had appeared since the initial pass, so nothing else was ingested. See
  [log.md](log.md) for the line-by-line record.
- **2026-07-04** — Second Brain Starter Pass (initial): vault created; 9 source notes,
  5 concept pages, 3 project pages, 4 decision pages seeded from real Build Log/PR
  history.
