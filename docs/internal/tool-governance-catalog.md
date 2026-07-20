# Tool governance catalog (V1 product baseline)

**Source of truth:** `lib/ops/toolGovernanceCatalog.ts`  
**Broader personal-stack catalog:** `docs/TOOL_CATALOG.md` (David's full agent tool stack)

This document describes **in-app systems and agents** the truecrew-dashboard product relies on in V1 — who owns them, when to use them, how they fail, and what is still partial.

## Status legend

| Status | Meaning |
|--------|---------|
| `active` | Wired and used in normal V1 operator flows |
| `partial` | Real but scoped — not full automation or not always available |
| `not_wired` | Documented only or planned — no product runtime |
| `planned` | Intentionally deferred |

## Catalog index

| id | name | category | owner | status |
|----|------|----------|-------|--------|
| `chief` | Chief | agent | operator / founder | active |
| `research-agent` | Research Agent | agent | founder | partial |
| `builder-agent` | Builder Agent | agent | founder | partial |
| `librarian-agent` | Librarian | agent | operator | partial |
| `monitor-surface` | Monitor | platform | operator | partial |

---

## `chief`

- **Best use:** Operator approvals, governed loop visibility, mission/approval activity, Chief home signals.
- **Avoid:** Treating Chief as an autonomous executor.
- **Config:** `/chief` routes; `VITE_USE_LIVE_API`; vault + Supabase when configured.
- **Failure signs:** Stalled pending approvals; broken deep-links; mock-only activity in non-live mode.
- **SOP:** `docs/internal/chief-v1-governed-loops.md`

## `research-agent`

- **Best use:** Project summary handoff and monitor-incident postmortem after Chief approval.
- **Avoid:** Open-ended research automation beyond the two governed mission kinds.
- **Config:** `lib/research/*`, Azure LLM router, Supabase context, Obsidian outputs.
- **Failure signs:** Missions `blocked`/`failed`; missing artifact paths.
- **SOP:** `docs/RESEARCH_AGENT_PACKET_SPEC.md`

## `builder-agent`

- **Best use:** Build approval cards, build-gate visibility, runtime QA proposals from Builds.
- **Avoid:** Assuming an autonomous Builder runner exists.
- **Config:** `buildAgentTestProposal.ts`; Builds page enqueue path; vault Build Log when configured.
- **Failure signs:** Open build gates with no card; runtime QA proposal never enqueued.
- **SOP:** `docs/BUILDER_AGENT_PACKET_SPEC.md`

## `librarian-agent`

- **Best use:** Optional filing refinement when `LIBRARIAN_AI_ENABLED` and vault are set.
- **Avoid:** Production reliance without checking Ollama/vault configuration.
- **Config:** `LIBRARIAN_AI_ENABLED`, `OLLAMA_HOST`, `OLLAMA_MODEL`.
- **Failure signs:** Silent skip when disabled; degraded signals when Ollama unreachable.
- **SOP:** `docs/AGENT_RUNBOOK.md`

## `monitor-surface`

- **Best use:** Vercel deploy recency + Supabase reachability in Monitor and Chief brief.
- **Avoid:** Expecting full repo/CI health aggregation.
- **Config:** `api/monitor/index.ts`; `VERCEL_API_TOKEN`; `VERCEL_PROJECT_ID`.
- **Failure signs:** Degraded probe cards; Chief monitor platform approval card.
- **SOP:** `docs/internal/chief-v1-governed-loops.md` (Production sanity pass)
