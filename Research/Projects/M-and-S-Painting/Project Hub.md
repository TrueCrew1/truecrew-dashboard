---
title: "Project Hub — M&S Painting V2"
status: "blocked"
project: "M&S Painting V2"
type: "hub"
---

# Project Hub — M&S Painting V2

## Project name
M&S Painting V2 (customer app context in True Crew; customer-app code lives in `TrueCrew1/ms-painting`, not this dashboard repo).

## Current status
**Filing checklist complete** for the planned OS/Obsidian structure. Filed: request log, V2 improvement plan, all three OS standards templates, competitive landscape & demand brief, and the blocked initial research package (from `M&S RESEARCH BLOCK.docx`). The package itself remains **status: blocked** — do not authorize implementation from it; first executable task is source acquisition/validation. Note: V2 plan and Research Lane template are now filed in this repo, which may satisfy part of the package’s exit criteria for a re-run — that re-run is not done in this filing PR.

## Primary source documents
- [[2026-07-23 - V2 Improvement Plan]] — **STATUS: FILED** (repo: `docs/ms-painting-v2/improvement-plan-v2.md`; source: M&S Painting Platform Improvement Plan)

## Standards used
- [[Research Lane Standard Template]] — **STATUS: FILED** (`os/standards/research_lane_standard_template.md`)
- [[Research Package Obsidian Template]] — **STATUS: FILED** (`os/standards/research_package_obsidian_template.md`)
- [[Founder Decision Summary Template]] — **STATUS: FILED** (`os/standards/founder_decision_summary_template.md`)

Related True Crew docs (related context, not substitutes for project packages):
- `docs/RESEARCH_AGENT_PACKET_SPEC.md`
- `docs/RESEARCH_RUNNER.md`
- `docs/AGENT_RUNBOOK.md` (Research sections)
- `docs/PROJECT_SEPARATION_FINDINGS.md`

## Request logs
- `req-ms-painting-v2-research-001` → `/os/requests/req-ms-painting-v2-research-001.json` — **STATUS: FILED** (routing JSON stored exactly; intent = builder-ready V2 package + competitive research; `work_type=learn`, `owning_center=research_center`, `model_target=gpt-5-mini`, `approval_required=false`)

Other M&S research request IDs exist in adapter backlog (`src/lib/research/adapterRequests.ts`) but are separate from this OS request log.

## Research artifacts
- [[0000 - Initial Research Package (Blocked)]] — **STATUS: FILED (blocked)** (repo: `research/ms-painting-v2/0000-initial-research-package-blocked.md`; source: `M&S RESEARCH BLOCK.docx`)

Related provisional findings already in knowledge (not complete packages):
- `knowledge/findings/m-and-s/painter-saas-market-scan.md`
- `knowledge/findings/m-and-s/truecrew-design-standard.md`
- `knowledge/findings/m-and-s/estimating-roadmap.md`

## Market research
- [[Market - Competitive Landscape and Demand]] — **STATUS: FILED** (repo: `research/ms-painting-v2/market/competition-and-demand.md`; directional themes only — verify pricing/claims before GTM)

## Decisions
- Folder: `Research/Projects/M-and-S-Painting/Decisions/` — empty aside from index README
- Template: [[Founder Decision Summary Template]] — **STATUS: FILED** (copy into project Decisions/ when a research package exists; keep decision **Blocked** until then)

## Missing items
- [x] Full routing JSON for `req-ms-painting-v2-research-001` — filed at `/os/requests/req-ms-painting-v2-research-001.json`
- [x] Full V2 improvement plan content — filed at `docs/ms-painting-v2/improvement-plan-v2.md`
- [x] Full blocked initial research package markdown — filed from `M&S RESEARCH BLOCK.docx`
- [x] Research Lane Standard Template body — filed at `os/standards/research_lane_standard_template.md`
- [x] Research Package Obsidian Template body — filed at `os/standards/research_package_obsidian_template.md`
- [x] Founder Decision Summary Template body — filed at `os/standards/founder_decision_summary_template.md`
- [x] Competitive landscape and demand brief body — filed at `research/ms-painting-v2/market/competition-and-demand.md`

## Next recommended filing step
1. After source-access review: re-run Research against the now-filed V2 plan + Research Lane template + current-state repo evidence (do not invent).
2. When a builder-ready package exists: copy [[Research Package Obsidian Template]] into a project package note and copy [[Founder Decision Summary Template]] into `Decisions/` (keep decision **Blocked** until evidence supports a choice).

## Repo ↔ Obsidian map
| Concept | Repo path | Obsidian note |
|---|---|---|
| Hub | (this note under `Research/…`) | [[Project Hub]] |
| Improvement plan | `docs/ms-painting-v2/improvement-plan-v2.md` | [[2026-07-23 - V2 Improvement Plan]] |
| Blocked package | `research/ms-painting-v2/0000-initial-research-package-blocked.md` | [[0000 - Initial Research Package (Blocked)]] |
| Market brief | `research/ms-painting-v2/market/competition-and-demand.md` | [[Market - Competitive Landscape and Demand]] |
| Request log | `os/requests/req-ms-painting-v2-research-001.json` | (JSON; linked above) |
| Standards | `os/standards/*.md` | `Research/Standards/*.md` |
