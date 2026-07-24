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
**Filing structure active.** Filed: request log, V2 improvement plan, Research Lane Standard Template, Founder Decision Summary Template, competitive landscape & demand brief. Still **MISSING**: blocked research package, Research Package Obsidian Template. Hub is usable for navigation; Research should not invent requirements beyond what the filed V2 plan and market brief state.

## Primary source documents
- [[2026-07-23 - V2 Improvement Plan]] — **STATUS: FILED** (repo: `docs/ms-painting-v2/improvement-plan-v2.md`; source: M&S Painting Platform Improvement Plan)

## Standards used
- [[Research Lane Standard Template]] — **STATUS: FILED** (`os/standards/research_lane_standard_template.md`)
- [[Research Package Obsidian Template]] — **STATUS: MISSING** (`os/standards/research_package_obsidian_template.md`)
- [[Founder Decision Summary Template]] — **STATUS: FILED** (`os/standards/founder_decision_summary_template.md`)

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
- [[Market - Competitive Landscape and Demand]] — **STATUS: FILED** (repo: `research/ms-painting-v2/market/competition-and-demand.md`; directional themes only — verify pricing/claims before GTM)

## Decisions
- Folder: `Research/Projects/M-and-S-Painting/Decisions/` — empty aside from index README
- Template: [[Founder Decision Summary Template]] — **STATUS: FILED** (copy into project Decisions/ when a research package exists; keep decision **Blocked** until then)

## Missing items
- [x] Full routing JSON for `req-ms-painting-v2-research-001` — filed at `/os/requests/req-ms-painting-v2-research-001.json`
- [x] Full V2 improvement plan content — filed at `docs/ms-painting-v2/improvement-plan-v2.md`
- [ ] Full blocked initial research package markdown
- [x] Research Lane Standard Template body — filed at `os/standards/research_lane_standard_template.md`
- [ ] Research Package Obsidian Template body
- [x] Founder Decision Summary Template body — filed at `os/standards/founder_decision_summary_template.md`
- [x] Competitive landscape and demand brief body — filed at `research/ms-painting-v2/market/competition-and-demand.md`

## Next recommended filing step
1. Paste the **blocked research package** (from `# Request Header` through `### Approval Required`) into `research/ms-painting-v2/0000-initial-research-package-blocked.md` and Obsidian mirror.
2. Paste **Research Package Obsidian Template** into `os/standards/research_package_obsidian_template.md` + `Research/Standards/`.

## Repo ↔ Obsidian map
| Concept | Repo path | Obsidian note |
|---|---|---|
| Hub | (this note under `Research/…`) | [[Project Hub]] |
| Improvement plan | `docs/ms-painting-v2/improvement-plan-v2.md` | [[2026-07-23 - V2 Improvement Plan]] |
| Blocked package | `research/ms-painting-v2/0000-initial-research-package-blocked.md` | [[0000 - Initial Research Package (Blocked)]] |
| Market brief | `research/ms-painting-v2/market/competition-and-demand.md` | [[Market - Competitive Landscape and Demand]] |
| Request log | `os/requests/req-ms-painting-v2-research-001.json` | (JSON; linked above) |
| Standards | `os/standards/*.md` | `Research/Standards/*.md` |
