---
title: "Repo Audit Report — 2026-07-12"
created: 2026-07-12
status: draft
owner: TrueCrew
---

# Repo Audit Report — 2026-07-12

**Auditor:** Claude Code, under Chief/Build/Filing guardrails
([docs/agents/Chief.md](../../../agents/Chief.md)).
**Spec:** [docs/OPERATIONS/REPO_AUDIT_SPEC.md](../../REPO_AUDIT_SPEC.md).

## Scope

**In scope:**
- Second-brain shelf docs (`docs/SECOND_BRAIN/`)
- Operations specs (`docs/OPERATIONS/`, including this audit)
- Agent contracts (`docs/AGENT_CONTRACTS/`)
- Agent lane docs (`AGENTS.md`, `docs/agents/`)

**Explicitly out of scope for this run:**
- `src/`, `api/` — present in the repo but not audited (structural docs/lane audit
  only; no code was scanned or changed).
- `routes/`, `tests/` — not present as top-level directories in this repo.
- Resolving the second-brain concept conflict or the logging conflict — both were
  known before this audit and remain unresolved by design (see Known conflicts below).

## Key observations

From [baseline.md](baseline.md):
- 9 shelf/lane markdown docs surveyed, all introduced in a single prior commit
  (`00dbe6d`) — no drift history yet, this baseline is the origin point.
- 8 of 9 have YAML frontmatter; `AGENTS.md` doesn't (by design, matching
  `CLAUDE.md`'s convention).

From [missing-items.md](missing-items.md):
- No broken cross-links found in `AGENTS.md` or the three lane docs — a clean result,
  not a gap.
- No `docs/OPERATIONS/logs/` folder exists; the `docs/OPERATIONS/audits/YYYY-MM-DD/`
  convention used for this very audit is new and not yet documented as the standard
  anywhere else in the shelf.
- Planner and Research roles remain undefined (acknowledged, not a surprise).
- No in-repo evidence yet that any shelf doc has actually been mirrored into the live
  Obsidian vault.

## Known conflicts (not resolved in this run)

1. **Second-brain concept conflict** — this repo already has a `knowledge/`-rooted
   second-brain concept (`docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md`,
   `docs/OBSIDIAN_RESEARCH_INTAKE.md`) and vault-path convention that doesn't match
   `docs/SECOND_BRAIN`'s index or its `vault/Operations/*` mirroring examples.
2. **Logging conflict** — `npm run obsidian:log` writes to the live vault;
   `docs/OPERATIONS/changelog.md` is a repo-tracked log. Their relationship is
   undefined.

Both are tracked in [docs/agents/Chief.md](../../../agents/Chief.md)'s "Open conflicts
to resolve" section.

## Next steps

- Schedule a Chief/Planner reconciliation session covering both known conflicts above,
  plus the `docs/AGENT_LANES_INTERNAL.md` vs. `AGENTS.md`/`docs/agents/Chief.md`
  overlap noted in `missing-items.md`.
- Define a standard location/naming convention for audit output
  (`docs/OPERATIONS/audits/YYYY-MM-DD/`, as used here) in
  `docs/OPERATIONS/REPO_AUDIT_SPEC.md` or `docs/agents/Chief.md`, so future audits
  don't have to re-decide it.
- When Filing actually mirrors shelf docs into the vault for the first time, record
  that as a missing-items resolution in the next audit pass.
