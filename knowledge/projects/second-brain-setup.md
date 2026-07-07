---
title: Second Brain Setup (this vault)
type: project
status: active
confidence: medium
last_reviewed: 2026-07-04
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

**Layered architecture in place.** The vault now has five memory layers (memory
index, event logs, raw capture, durable knowledge, lessons, reference —
`docs/AGENT_RUNBOOK.md` § Memory Architecture), a `MEMORY.md` always-checked-first
index, a `lessons/` system for behavior-changing rules (superseding the earlier
`patterns/` one-page-per-type design), and `reference/` for stable lookups. All 6
high-value concept pages are normalized into a compact playbook shape (Summary / What
works / What to check first / Open questions / Related) with `status`/`confidence`/
`last_reviewed` fields; projects and decisions carry the same fields.

## Key milestones / timeline

- 2026-07-04 — Vault structure, templates, and runbook workflow/rules authored.
- 2026-07-04 — Initial seeding pass run against current real state.
- 2026-07-04 — Governance pass: caps, priority hierarchy, page-quality rules, and
  safeguards added; one candidate page (a standalone Agent Runbook concept) explicitly
  rejected as duplicative of `concepts/chief-approvals.md` rather than created.
- 2026-07-04 — High-Value Learning Capture added: `patterns/` folder (6 type-pages),
  a learning schema, a closing "Learning capture and promotion" step on every
  workflow.
- 2026-07-04 — Layered-memory upgrade: `patterns/` superseded by `lessons/` (one file
  per lesson, leaner schema); `MEMORY.md` and `reference/` added; concept pages
  normalized into playbooks; `Memory Review Pass` added as a new workflow.

## Open items

- No recurring cadence is set for the Second Brain Starter Pass — David triggers a
  pass by asking Chief, only after notable dashboard/governance work or on explicit
  request. Same for the new Memory Review Pass.
- 7 of the original 10 dashboard-audit findings (beyond the 3 that shipped as PRs
  #75/#76/#77) still aren't captured as their own source notes — logged as a deferred
  candidate again this pass, still below the 3–6-month bar to justify on its own.
- Whether `knowledge/` content should ever sync into the Obsidian vault
  (`docs/vault-templates/` already exists for a *different* purpose — mirroring select
  docs into Obsidian) is an open question, not decided here. For now the two are
  deliberately separate: this vault is markdown-in-repo, no Obsidian dependency.
- All caps have wide headroom as of this pass (concepts 6/10, projects 3/5,
  decisions 4/15, sources 10/50, lessons 5/20, reference 2/10) — the deferral
  mechanic is documented but hasn't yet been exercised by an actual cap hit. The
  Memory Review Pass hasn't been run for real yet either.

## Related

- Pages: [truecrew-dashboard](truecrew-dashboard.md), [chief-approvals](../concepts/chief-approvals.md)
- PRs: [#80](https://github.com/TrueCrew1/truecrew-dashboard/pull/80)
- Decisions: none yet — the vault itself is internal/reversible and doesn't need one
