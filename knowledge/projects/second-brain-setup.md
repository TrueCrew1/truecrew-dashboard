---
title: Second Brain Setup (this vault)
type: project
status: active
created: 2026-07-04
updated: 2026-07-04
related_pages: [truecrew-dashboard, chief-approvals]
related_prs: [80]
related_cards: []
---

# Second Brain Setup (this vault)

## Goal

Give True Crew an agent-maintained, plain-markdown knowledge base (`knowledge/` in
this repo) that turns work David already produces — Build Log entries, Agent Runbook
sections, PRs, `ApprovalCard` outcomes, audits, status checks — into durable notes,
without requiring David to develop a manual note-taking habit. See
`knowledge/README.md` for the full pitch.

## Current status

**Governed, second pass complete.** Vault skeleton and initial seeding (9 sources, 5
concepts, 3 projects, 4 decisions) are in place from the first pass. This second pass
added first-month governance rather than new source material — no new PRs/merges had
landed since the first pass, so nothing new qualified for ingestion under the new
3–6-month test. Added: hard caps (concepts ≤10, projects ≤5, decisions ≤15,
sources ≤50), a 4-tier priority order for what earns a page, an explicit run-frequency
rule (explicit ask or notable work only, no timer), and three safeguards (no orphaned
pages, no duplicate topics, no uncontrolled renaming) — all in
`docs/AGENT_RUNBOOK.md`, summarized in `concepts/second-brain-workflow.md`.

## Key milestones / timeline

- 2026-07-04 — Vault structure, templates, and runbook workflow/rules authored.
- 2026-07-04 — Initial seeding pass run against current real state.
- 2026-07-04 — Governance pass: caps, priority hierarchy, page-quality rules, and
  safeguards added; one candidate page (a standalone Agent Runbook concept) explicitly
  rejected as duplicative of `concepts/chief-approvals.md` rather than created.

## Open items

- No recurring cadence is set — David triggers a pass by asking Chief, only after
  notable dashboard/governance work or on explicit request.
- 7 of the original 10 dashboard-audit findings (beyond the 3 that shipped as PRs
  #75/#76/#77) still aren't captured as their own source notes — logged as a deferred
  candidate again this pass, still below the 3–6-month bar to justify on its own.
- Whether `knowledge/` content should ever sync into the Obsidian vault
  (`docs/vault-templates/` already exists for a *different* purpose — mirroring select
  docs into Obsidian) is an open question, not decided here. For now the two are
  deliberately separate: this vault is markdown-in-repo, no Obsidian dependency.
- All four caps have wide headroom as of this pass (concepts 6/10, projects 3/5,
  decisions 4/15, sources 10/50) — the deferral mechanic is documented but hasn't yet
  been exercised by an actual cap hit.

## Related

- Pages: [truecrew-dashboard](truecrew-dashboard.md), [chief-approvals](../concepts/chief-approvals.md)
- PRs: [#80](https://github.com/TrueCrew1/truecrew-dashboard/pull/80)
- Decisions: none yet — the vault itself is internal/reversible and doesn't need one
