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
**Filing structure active.** Request log `req-ms-painting-v2-research-001` is **filed**. Primary source docs, research package, standards templates, and market brief are still **MISSING** content. Hub is usable for navigation; Research/Build should not invent requirements until the improvement plan and research package are filed.

## Primary source documents
- [[2026-07-23 - V2 Improvement Plan]] — **STATUS: MISSING** (repo: `docs/ms-painting-v2/improvement-plan-v2.md`)

## Standards used
- [[Research Lane Standard Template]] — **STATUS: MISSING** (`os/standards/research_lane_standard_template.md`)
- [[Research Package Obsidian Template]] — **STATUS: MISSING** (`os/standards/research_package_obsidian_template.md`)
- [[Founder Decision Summary Template]] — **STATUS: MISSING** (`os/standards/founder_decision_summary_template.md`)

Related True Crew docs (not substitutes for the MISSING templates):
- `docs/RESEARCH_AGENT_PACKET_SPEC.md`
- `docs/RESEARCH_RUNNER.md`
- `docs/AGENT_RUNBOOK.md` (Research sections)
- `docs/PROJECT_SEPARATION_FINDINGS.md`

## Request logs
- `req-ms-painting-v2-research-001` → `/os/requests/req-ms-painting-v2-research-001.json` — **STATUS: FILED** (routing JSON stored exactly; intent = builder-ready V2 package + competitive research; `work_type=learn`, `owning_center=research_center`, `model_target=gpt-5-mini`, `approval_required=false`)

Other M&S research request IDs exist in adapter backlog (`src/lib/research/adapterRequests.ts`) but are separate from this OS request log.

## Research artifacts
- [[0000 - Initial Research Package (Blocked)]] — **STATUS: MISSING** (repo: `research/ms-painting-v2/0000-initial-research-package-blocked.md`)

Related provisional findings already in knowledge (not complete packages):
- `knowledge/findings/m-and-s/painter-saas-market-scan.md`
- `knowledge/findings/m-and-s/truecrew-design-standard.md`
- `knowledge/findings/m-and-s/estimating-roadmap.md`

## Market research
- [[Market - Competitive Landscape and Demand]] — **STATUS: MISSING** (repo: `research/ms-painting-v2/market/competition-and-demand.md`)

## Decisions
- Folder: `Research/Projects/M-and-S-Painting/Decisions/` — empty aside from index README
- Template: [[Founder Decision Summary Template]] (MISSING content)

## Missing items
- [x] Full routing JSON for `req-ms-painting-v2-research-001` — filed at `/os/requests/req-ms-painting-v2-research-001.json`
- [ ] Full blocked initial research package markdown
- [ ] Full V2 improvement plan content
- [ ] Research Lane Standard Template body
- [ ] Research Package Obsidian Template body
- [ ] Founder Decision Summary Template body
- [ ] Competitive landscape and demand brief body

## Next recommended filing step
1. Paste the **V2 improvement plan** into `docs/ms-painting-v2/improvement-plan-v2.md` and the Obsidian mirror `2026-07-23 - V2 Improvement Plan.md` (exact source text) — required by `req-ms-painting-v2-research-001` intent.
2. Paste the **blocked research package** into `research/ms-painting-v2/0000-initial-research-package-blocked.md` and the Obsidian mirror (if that package is still the authoritative blocked state).
3. File standards templates under `os/standards/` + `Research/Standards/` when available.
4. Fill Market competition/demand from real sources only (criteria are defined in the request log’s `verification_method`; do not invent).

## Repo ↔ Obsidian map
| Concept | Repo path | Obsidian note |
|---|---|---|
| Hub | (this note under `Research/…`) | [[Project Hub]] |
| Improvement plan | `docs/ms-painting-v2/improvement-plan-v2.md` | [[2026-07-23 - V2 Improvement Plan]] |
| Blocked package | `research/ms-painting-v2/0000-initial-research-package-blocked.md` | [[0000 - Initial Research Package (Blocked)]] |
| Market brief | `research/ms-painting-v2/market/competition-and-demand.md` | [[Market - Competitive Landscape and Demand]] |
| Request log | `os/requests/req-ms-painting-v2-research-001.json` | (JSON; linked above) |
| Standards | `os/standards/*.md` | `Research/Standards/*.md` |
