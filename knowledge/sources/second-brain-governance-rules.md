---
title: Second Brain governance rules added (caps, priority, safeguards)
type: source
status: raw
created: 2026-07-04
updated: 2026-07-04
related_pages: [second-brain-workflow, second-brain-setup]
related_prs: [80]
related_cards: []
---

# Second Brain governance rules added (caps, priority, safeguards)

## Origin

David's task, this session: "Run the Second Brain Starter Pass conservatively and
enforce rules that keep the vault small, high-signal, and non-chaotic for the first
month." Implemented as additional commits on the still-open PR #80 (same branch as the
vault's original creation).

## Raw summary

Added a **Scope limits (first month)** subsection to the Second Brain Starter Pass
workflow in `docs/AGENT_RUNBOOK.md` (hard caps: concepts ≤10, projects ≤5, decisions
≤15, sources ≤50; a 4-tier priority order for what earns a page; a "will I care 3–6
months from now" filter; a run-frequency rule limited to explicit requests or notable
governance/dashboard work, no automatic schedule). Added **page quality rules** and
three named **safeguards** (no orphaned pages, no duplicate topics, no uncontrolled
renaming) plus a tightened **logging discipline** rule to the Knowledge Maintenance
section.

## Extracted facts

- This pass found nothing new to ingest from Build Log/PR activity since the vault's
  initial seeding (checked `gh pr list` and the branch's git log — no new PRs or
  merges since PR #80 was opened).
- Applying the new rules to the existing vault: no caps were close to being hit
  (concepts 5→6 of 10, projects 3 of 5, decisions 4 of 15, sources 9→10 of 50 after
  this pass) — this pass is a governance addition, not a cap-driven prune.
- One candidate page was considered and explicitly rejected as a duplicate rather
  than created: a standalone `concepts/agent-runbook.md` (the top-priority-tier "Agent
  Runbook" as a live system). Rejected because `concepts/chief-approvals.md` already
  covers the runbook's approval-routing content in depth — a separate page would
  restate it under a different name. Recorded per the new "no duplicate topics"
  safeguard rather than created.

## Processed into

- [concepts/second-brain-workflow.md](../concepts/second-brain-workflow.md)
- [projects/second-brain-setup.md](../projects/second-brain-setup.md)
