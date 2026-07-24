---
title: Agent Readiness Audit — July 2026
type: project
status: active
confidence: high
last_reviewed: 2026-07-24
created: 2026-07-24
updated: 2026-07-24
related_pages: [truecrew-dashboard, dashboard-audit-july-2026, dashboard-maintenance, chief-approvals]
related_prs: [180, 208]
related_cards: []
---

# Agent Readiness Audit — July 2026

## Goal

Find what is still missing before True Crew agents can **start real work** from the
dashboard — not invent new agent features. Scope: Chief → Agents status surface,
governed Research missions, and the research-runner loop documented in
`docs/RESEARCH_RUNNER.md`.

## Verdict

Agents are **partially ready**. Governed Research mission code paths exist and are
REAL in `docs/V1_TRUTH_MAP.md`, but operators still cannot reliably see live agent
status or hand work to a runner until a short merge + ops checklist is cleared.
Build has no autonomous runner by design (V1).

## Insights (facts from repo / open PRs)

### A. Dashboard Agents surface — code ready, not on `main`

| Gap on `main` | Evidence | Fix status |
|---|---|---|
| No soft refresh of live data — Agents board goes stale until full reload | Prior triage agent + PR #208 body; `DataContext` on `main` has no 30s soft-poll | **PR #208** (draft, CI green, MERGEABLE) |
| Roadmap Agent has no live derivation; `decision` tasks bleed into Workflow Gate | `docs/AGENTS_BOARD.md` says Roadmap owns `decision`; `deriveWorkflowGateAgentWorkItems` on `main` only excludes `build`, not `decision`; no `deriveRoadmapAgentWorkItems` | **PR #208** |
| Weak empty / loading / error / degraded UI on Agents tab + status strip | PR #208 changes to `AgentWorkBoard.tsx`, `AgentStatusStrip.tsx` | **PR #208** |
| Stale Roadmap/Marketer mock + mock PR approval cards can appear beside live data | PR #180 body; `AGENT_WORK_ITEMS` / `MOCK_PR_APPROVAL_CARDS` | **PR #180** (open; overlaps Marketer gating with #208) |

### B. Agent execution loops — wired in code, gated on env + ops

| Capability | Code truth | What still blocks “start working” |
|---|---|---|
| Project-summary handoff + monitor-incident postmortem | REAL (V1 Truth Map) — approve → POST mission → vault artifacts + Build Log | Needs live API + internal auth + Supabase + Obsidian vault path + Azure LLM (`AZURE_OPENAI_API_KEY`, `AZURE_AI_RESOURCE_ENDPOINT`). Missing any → `blocked` / `failed`, never fake `completed`. |
| Research queue → Start-research approval → `in_progress` | REAL — `researchStartApprovals.ts`, `research_requests` migration `20260722000001_research_requests.sql` | Queue migration must be applied (`npm run db:push` per runner docs). Operator must approve the Start-research card. Nothing auto-runs from `queued`. |
| Scheduled research runner | Documented only in `docs/RESEARCH_RUNNER.md` | Needs a scheduled Claude Code cloud agent with `TRUECREW_API_URL` + `TRUECREW_INTERNAL_KEY`. Without them, runner falls back to repo scaffolds (degraded but honest). **No runner schedule was verified in this audit** (not present in repo Actions/workflows as an agent cron). |
| Build Agent | Chief approval path + board rows from build tasks | **No autonomous Build runner** — Agent status strip correctly labels “Configured; no autonomous build runner.” Intentional V1 limit. |
| Librarian | Live filing candidates when live API + Supabase; vault writes when vault configured | Vault unset → silent skip of vault writes (`V1_TRUTH_MAP` Librarian gap). |
| Marketer Agent | Mock only | No marketing/content workflow type in the data model (`docs/AGENTS_BOARD.md`). |

### C. Operational readiness composition (deterministic)

`lib/chief/operationalReadiness.ts` expects overall **`partial`** on typical V1
`main`. Hard blockers only if CI workflow file is missing (it is present). Common
partial / warning signals: Slack webhook unset, Google Drive `not_wired`, reporting
modules env-gated, vault/Supabase unset in the local/dev process env.

This audit did **not** probe production Vercel env values (Vercel MCP unauthenticated
in this run) — treat production secret presence as an Ops check, not a code finding.

### D. Out of scope for “agents start working” (deferred July dashboard audit)

Still deferred from `projects/dashboard-audit-july-2026.md`: mobile Chief-panel /
sidebar overlap, oversized `chiefLiveContext.ts` / `ChiefPanel.tsx`, spacing-token
scale. UX debt — not a runner or mission blocker.

## Opportunities

1. **Merge PR #208** — single highest-leverage product fix so Chief → Agents reflects
   live Roadmap/Workflow Gate attribution and refreshes without a hard reload.
2. **Reconcile PR #180 with #208** — both gate Marketer mock in live mode; merge one
   after the other or fold remaining Approvals mock gating from #180 into a follow-up
   if #208 lands first.
3. **Stand up the research runner once** — schedule one Cursor/Claude cloud agent,
   set `TRUECREW_API_URL` + `TRUECREW_INTERNAL_KEY`, confirm `research_requests`
   migration on the live Supabase project, then approve one Start-research card as a
   smoke test.
4. **Confirm production env** for Azure + Obsidian vault + `VITE_USE_LIVE_API` so
   handoff/postmortem missions can leave mock “Not live” strip state.

## Risks

- Merging #180 and #208 without checking overlap may double-touch Agents board mock
  gating and cause merge conflicts.
- Assuming the research runner “just exists” because `docs/RESEARCH_RUNNER.md` exists —
  the contract is real; the schedule/env is human ops.
- Treating Build “Configured / healthy” as “Build is running work” — the strip means
  the approval path is wired, not that builds execute themselves.
- Re-auditing July 2026 UI debt (#75/#76/#77 already shipped) instead of clearing the
  agent-start checklist above.

## Recommended actions (solo-founder, soon)

**Merge path (product):**

1. Review and merge **PR #208** (Agents board live status / refresh / empty-error).
2. Re-check **PR #180**; merge remaining Approvals mock-card gating or close as
   superseded if #208 covers the Agents portion.

**Ops to run (human-only — not done by this audit):**

1. Confirm live Supabase has `research_requests` applied (`npm run db:push` if not).
2. Confirm Vercel / production has at least: `INTERNAL_API_SECRET` /
   `VITE_INTERNAL_KEY`, `VITE_USE_LIVE_API=true`, Supabase URL + service role, Azure
   OpenAI key + resource endpoint, Obsidian vault path where missions write.
3. Create/configure the scheduled research runner with `TRUECREW_API_URL` +
   `TRUECREW_INTERNAL_KEY`.
4. Smoke: queue a research topic → approve Start-research card → confirm runner
   picks `in_progress` (or file via repo fallback and PATCH status).

**Do not block agent-start on:** Marketer live rows, autonomous Build runner, Drive
workspace, Slack turnover cron, in-app repo-health signals — those are V1 partial /
V2 by Truth Map.

## Related

- Pages: [truecrew-dashboard](truecrew-dashboard.md), [dashboard-audit-july-2026](dashboard-audit-july-2026.md), [dashboard-maintenance](../concepts/dashboard-maintenance.md)
- Docs: `docs/AGENTS_BOARD.md`, `docs/RESEARCH_RUNNER.md`, `docs/V1_TRUTH_MAP.md`, `docs/AGENT_CAPABILITIES_SUMMARY.md`, `docs/internal/chief-operational-readiness.md`
- PRs: #180, #208
