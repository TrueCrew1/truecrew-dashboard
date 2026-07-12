---
title: "Second Brain — Index"
created: 2026-07-12
status: draft
owner: TrueCrew
---

# Second Brain — Index

A concise map of the second brain shelf files and their purpose. Use this as a first stop when navigating the shelf.

- docs/SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md — Obsidian vault audit spec; on-demand audit checklist for vault health. (mirror target: vault/Operations/Obsidian Vault Audit Spec.md)
- docs/SECOND_BRAIN/SECOND_BRAIN_INDEX.md — This index file (map).
- docs/AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md — Filing agent contract for mirroring and safe edits. (mirror target: vault/Agents/Obsidian Filing Agent Contract.md)
- docs/AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md — Build agent contract for repo/shelf maintenance. (mirror target: vault/Agents/Second Brain Build Agent Contract.md)
- docs/OPERATIONS/REPO_AUDIT_SPEC.md — Repo audit spec for on-demand repo checks. (mirror target: vault/Operations/Repo Audit Spec.md)
- docs/OPERATIONS/changelog.md — Operational changelog and log format. (mirror target: vault/Operations/Changelog.md)

Mirroring targets (examples):
- Vault path: vault/Operations/Second Brain/* (mirror of docs/SECOND_BRAIN)
- Repo path: docs/SECOND_BRAIN/* (canonical source-of-truth)

## Audits convention (provisional)

Repo audits (per [docs/OPERATIONS/REPO_AUDIT_SPEC.md](../OPERATIONS/REPO_AUDIT_SPEC.md))
are filed under `docs/OPERATIONS/audits/YYYY-MM-DD/`. First used 2026-07-12 — not yet
confirmed as the permanent standard. First run's artifacts:
- docs/OPERATIONS/audits/2026-07-12/baseline.md
- docs/OPERATIONS/audits/2026-07-12/missing-items.md
- docs/OPERATIONS/audits/2026-07-12/audit-report.md

---

**NOTE (filed as-is, ambiguity flagged per filing instructions — not resolved here):**
This shelf was filed verbatim from a provided draft. Two things weren't verifiable against
the current repo state and are flagged rather than guessed at:
1. This repo already has research/second-brain planning docs
   ([docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md](../RESEARCH_SECOND_BRAIN_WORKFLOW.md),
   [docs/OBSIDIAN_RESEARCH_INTAKE.md](../OBSIDIAN_RESEARCH_INTAKE.md)) that describe a
   different, git-tracked second-brain root (`knowledge/`), which does not currently exist
   in this working tree. This shelf's relationship to that existing spec — same concept,
   separate concept, or superseding it — is undefined and should be reconciled before either
   is treated as authoritative.
2. The "mirror target" vault paths above (`vault/Operations/...`) don't match this repo's
   existing Obsidian vault-path convention, which is relative to `OBSIDIAN_VAULT_PATH` with
   no `vault/` prefix (e.g. `Operations/Logs/Build Log.md`, `Research/...` — see
   [docs/OBSIDIAN_LOGGING.md](../OBSIDIAN_LOGGING.md),
   `lib/obsidian/paths.ts`). Whether "vault/" here is illustrative shorthand or a literal
   path segment is unclear from the draft alone.

See [docs/OPERATIONS/AGENT_LANE_RECONCILIATION_PLAN.md](../OPERATIONS/AGENT_LANE_RECONCILIATION_PLAN.md)
for the current provisional precedence rule and tracked status of both open items above.
