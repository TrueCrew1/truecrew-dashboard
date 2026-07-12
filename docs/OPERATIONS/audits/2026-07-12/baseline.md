---
title: "Repo Audit — Baseline (2026-07-12)"
created: 2026-07-12
status: draft
owner: TrueCrew
---

# Repo Audit — Baseline

First on-demand repo audit under [docs/OPERATIONS/REPO_AUDIT_SPEC.md](../../REPO_AUDIT_SPEC.md).
Snapshot of the second-brain shelf and agent-lane docs as they exist right now —
factual inventory only, no judgment calls (those go in `missing-items.md` and
`audit-report.md`).

## Second Brain shelves — `docs/SECOND_BRAIN/`

| File | Frontmatter |
|---|---|
| SECOND_BRAIN_INDEX.md | present |
| SECOND_BRAIN_OBSIDIAN_AUDIT.md | present |

2 files. Last commit touching this folder: `00dbe6d` (2026-07-12, "Wire second brain
shelves into agent roles (Chief/Build/Filing)").

## Operations specs — `docs/OPERATIONS/`

| File | Frontmatter |
|---|---|
| REPO_AUDIT_SPEC.md | present |
| changelog.md | present |
| audits/ (this folder) | new as of this run |

Last commit touching this folder (before this audit's own changes): `00dbe6d`
(2026-07-12).

## Agent contracts — `docs/AGENT_CONTRACTS/`

| File | Frontmatter |
|---|---|
| OBSIDIAN_FILING_AGENT_CONTRACT.md | present |
| SECOND_BRAIN_BUILD_AGENT_CONTRACT.md | present |

2 files. Last commit touching this folder: `00dbe6d` (2026-07-12).

## Agent lanes — `AGENTS.md` and `docs/agents/`

| File | Frontmatter |
|---|---|
| AGENTS.md (repo root) | **none** — plain markdown title, consistent with `CLAUDE.md`'s convention, not the shelf's YAML-frontmatter convention |
| docs/agents/Chief.md | present |
| docs/agents/Build.md | present |
| docs/agents/Filing.md | present |

4 files total (1 root + 3 lane docs). Last commit touching `docs/agents/`: `00dbe6d`
(2026-07-12). Last commit touching `AGENTS.md`: `00dbe6d` (2026-07-12).

## Totals

- 9 shelf/lane markdown docs surveyed (2 second-brain + 2 operations specs + 2 agent
  contracts + 3 agent lane docs), plus `AGENTS.md`.
- 8 of 9 shelf/lane docs have YAML frontmatter; `AGENTS.md` does not (by design —
  different convention, not a shelf doc).
- All surveyed files were introduced in a single commit (`00dbe6d`), so there is no
  drift history to report yet — this baseline is effectively the origin point.

## Explicitly not audited in this run

- `src/`, `api/` — present in the repo but out of scope per this run's instructions
  (structural docs/lane audit only, not a code audit).
- `routes/`, `tests/` — not present as top-level directories in this repo at all.
