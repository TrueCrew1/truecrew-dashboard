---
title: "Repo Audit — Missing Items (2026-07-12)"
created: 2026-07-12
status: draft
owner: TrueCrew
---

# Repo Audit — Missing Items

Findings from the first on-demand repo audit under
[docs/OPERATIONS/REPO_AUDIT_SPEC.md](../../REPO_AUDIT_SPEC.md) §5–6. Structural gaps
only — not resolved here, not exhaustive frontmatter nitpicking. Filed as findings,
not fixes.

## Checked and clean (stated explicitly, not just omitted)

- All markdown links in `AGENTS.md`, `docs/agents/Chief.md`, `docs/agents/Build.md`,
  `docs/agents/Filing.md`, and the plain-text file references in
  `docs/SECOND_BRAIN/SECOND_BRAIN_INDEX.md` resolve to real files in this repo. No
  broken cross-links found in this pass.
- 8 of 9 shelf/lane docs have YAML frontmatter with the fields the spec expects
  (title, created, status, owner, tags where applicable).

## Missing or incomplete repo audit artifacts

- No `docs/OPERATIONS/logs/` folder exists. Only `docs/OPERATIONS/changelog.md`
  (high-level) and this new `docs/OPERATIONS/audits/` folder (per-run detail) exist as
  logging surfaces.
- This `docs/OPERATIONS/audits/YYYY-MM-DD/` convention is new as of this run —
  nothing in `docs/OPERATIONS/REPO_AUDIT_SPEC.md`,
  `docs/SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md`, or `docs/agents/Chief.md`'s
  "Run Repo Audit" procedure specifies where audit output should live — this run
  picked a convention but it isn't yet documented as the standard.

## Missing links between specs and agents

- `docs/AGENT_LANES_INTERNAL.md` (an existing, more detailed Chief/Research/Filing
  lane definition) and the new `AGENTS.md` / `docs/agents/Chief.md` are not
  reconciled — `docs/agents/Chief.md` links to it as an input but does not state
  which one governs on conflict.
- `AGENTS.md` itself has no YAML frontmatter, unlike every other shelf/lane doc —
  consistent with `CLAUDE.md`'s plain-markdown convention, but inconsistent with the
  shelf's own frontmatter convention. Not flagged as an error, just a structural
  inconsistency worth a decision.

## Missing role docs or contracts (spec §5)

- Planner and Research roles are named in `AGENTS.md`'s shelf-roles list as "future
  roles, not fully defined here yet" — intentional per the original filing
  instructions, but still a real gap against spec §5's "missing role docs or
  contracts" check.

## Missing mirror entries in vault (spec §5)

- No in-repo evidence that any of the six shelf docs have actually been mirrored into
  the live Obsidian vault yet (no Filing-agent run artifact, no vault-side log entry
  referencing this shelf found in this repo checkout). The vault itself is external
  to this repo and wasn't inspected directly in this audit.

## Known conceptual gaps (second brain, logging, lanes)

Restated from `docs/agents/Chief.md`'s "Open conflicts to resolve" — not new findings,
listed here for completeness against the spec's missing-items checklist:
- Second-brain concept conflict (`knowledge/` vs. `docs/SECOND_BRAIN`, vault-path
  convention mismatch).
- Logging conflict (`npm run obsidian:log` vs. `docs/OPERATIONS/changelog.md`).
