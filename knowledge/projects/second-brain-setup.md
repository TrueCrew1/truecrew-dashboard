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

**Initial Second Brain Starter Pass complete.** Vault skeleton created
(`README.md`, `index.md`, `log.md`, `templates/`, and the five content folders);
`docs/AGENT_RUNBOOK.md` gained a **Second Brain Starter Pass** workflow definition plus
a **Knowledge Maintenance** operating-rules section; the vault was seeded with real
content: 9 source notes, 5 concept pages, 3 project pages (including this one), and 4
decision pages, all traced back to real PRs and Build Log entries — nothing invented.

## Key milestones / timeline

- 2026-07-04 — Vault structure, templates, and runbook workflow/rules authored.
- 2026-07-04 — Initial seeding pass run against current real state (this entry).

## Open items

- This is the *first* pass — most of the vault's long-term value comes from repeated
  passes as more work happens, not from this one seeding. No recurring cadence is set;
  David triggers it by asking Chief.
- 7 of the original 10 dashboard-audit findings (beyond the 3 that shipped as PRs
  #75/#76/#77) aren't yet captured as their own source notes — a candidate for the next
  pass if that detail turns out to matter later.
- Whether `knowledge/` content should ever sync into the Obsidian vault
  (`docs/vault-templates/` already exists for a *different* purpose — mirroring select
  docs into Obsidian) is an open question, not decided here. For now the two are
  deliberately separate: this vault is markdown-in-repo, no Obsidian dependency.

## Related

- Pages: [truecrew-dashboard](truecrew-dashboard.md), [chief-approvals](../concepts/chief-approvals.md)
- PRs: [#80](https://github.com/TrueCrew1/truecrew-dashboard/pull/80)
- Decisions: none yet — the vault itself is internal/reversible and doesn't need one
