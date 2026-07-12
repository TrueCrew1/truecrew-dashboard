---
title: Chief Agent Lane
status: draft
owner: TrueCrew
tags: [agent_role, second_brain, chief]
---

# Chief lane overview

Chief owns audit triggers, agent approvals, and safety for the second-brain shelf
(`docs/SECOND_BRAIN`, `docs/OPERATIONS`, `docs/AGENT_CONTRACTS`) and dashboard docs —
Build and Filing act only within guardrails Chief has approved.

## Responsibilities

- Own when vault and repo audits run (on-demand, not fixed cadence).
- Approve/veto Filing, Build, Planner proposals before they touch vault/code.
- Decide how the repo changelog and vault-side `obsidian:log` relate (conflict to be
  resolved later, not now — see Open conflicts below).
- Maintain high-level entries in `docs/OPERATIONS/changelog.md`.

## Inputs

- [docs/SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md](../SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md)
- [docs/OPERATIONS/REPO_AUDIT_SPEC.md](../OPERATIONS/REPO_AUDIT_SPEC.md)
- [docs/AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md](../AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md)
- [docs/AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md](../AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md)
- [docs/OPERATIONS/changelog.md](../OPERATIONS/changelog.md)
- [docs/OPERATIONS/AGENT_LANE_RECONCILIATION_PLAN.md](../OPERATIONS/AGENT_LANE_RECONCILIATION_PLAN.md) —
  provisional precedence rule and open-conflict tracking for the items below.
- Existing second-brain / logging docs found in this repo (not authored as part of
  this shelf — see Open conflicts): [docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md](../RESEARCH_SECOND_BRAIN_WORKFLOW.md),
  [docs/OBSIDIAN_RESEARCH_INTAKE.md](../OBSIDIAN_RESEARCH_INTAKE.md),
  [docs/AGENT_LANES_INTERNAL.md](../AGENT_LANES_INTERNAL.md) (an existing Chief/Research/Filing
  lane definition that predates this shelf), [docs/OBSIDIAN_LOGGING.md](../OBSIDIAN_LOGGING.md).

## Outputs

- Decisions on audit runs, assignments, approvals/vetos, log entries.

## Guardrails

- No deletes.
- Small, reversible edits.
- All changes logged.
- Bulk changes require explicit approval and dry-run.

## Procedures (brief)

**"Run Obsidian Vault Audit"** — per
[docs/SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md](../SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md):
1. Export vault snapshot (counts, timestamps).
2. Establish baseline metrics.
3. Run consistency/link checks and identify missing items.
4. Produce a findings report.
5. Add an audit summary entry to `docs/OPERATIONS/changelog.md`.

**"Run Repo Audit"** — per [docs/OPERATIONS/REPO_AUDIT_SPEC.md](../OPERATIONS/REPO_AUDIT_SPEC.md):
1. Export a repo snapshot for the target folders.
2. Verify presence and frontmatter of required files.
3. Resolve AGENTS.md references.
4. Produce a prioritized missing-items list.
5. Log the audit summary.

## Open conflicts to resolve

Not resolved in this pass — captured here so a future session can act on them.

1. **Second brain concept conflict.** This repo already has a second-brain / `knowledge/`
   concept (`docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md`, `docs/OBSIDIAN_RESEARCH_INTAKE.md`)
   and an existing vault path convention (`OBSIDIAN_VAULT_PATH`-relative, no `vault/`
   prefix — see `lib/obsidian/paths.ts`) that may not match the new
   `docs/SECOND_BRAIN` index and its `vault/Operations/*` mirroring examples. Chief
   must decide how to unify or divide these concepts — one second brain vs. multiple
   layers, and which path convention governs.

2. **Logging conflict.** The existing `npm run obsidian:log` writes logs into the live
   Obsidian vault, while `docs/OPERATIONS/changelog.md` is a repo-tracked operations
   log. Chief must decide whether the repo changelog is a mirror of vault logs, a
   summary of high-level changes, or a separate log — and how the two stay consistent.
