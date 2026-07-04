# Knowledge Base Index

Start here. See [README.md](README.md) for what this vault is and how it's meant to be
used.

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

Raw-artifact notes — see [sources/](sources/) for the full list (PR-by-PR notes for
#57/#58, #71, #75, #76, #77, #78, #79, plus the Vercel status-check experiment and the
Approval Load runbook section).

## Recent updates

- **2026-07-04** — Second Brain Starter Pass (initial): vault created; 9 source notes,
  5 concept pages, 3 project pages, 4 decision pages seeded from real Build Log/PR
  history. See [log.md](log.md) for the full line-by-line record.
