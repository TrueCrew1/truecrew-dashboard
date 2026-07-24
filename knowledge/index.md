# Knowledge Base Index

The **complete** map of every page in `knowledge/`. For the small, curated
"check-this-first" index, see [MEMORY.md](MEMORY.md) instead — start there for any
real task; come here when you need the full list. See [README.md](README.md) for what
this vault is and how it's meant to be used.

## Vault size (at a glance)

First-month hard caps, per `docs/AGENT_RUNBOOK.md` § Second Brain Starter Pass —
enforced, not aspirational. See [concepts/second-brain-workflow.md](concepts/second-brain-workflow.md)
for the full rule set.

| Category | Count | Cap |
|---|---|---|
| Concepts | 6 | 10 |
| Projects | 4 | 5 |
| Decisions | 4 | 15 |
| Sources | 10 | 50 |
| Findings | 3 | — (V1 Research filing shelf; not under first-month source cap) |
| Lessons | 5 | 20 |
| Reference | 4 | 10 |

## Concepts

Durable topic pages, normalized into compact playbooks (Summary / What works / What
to check first / Open questions / Related). `status` = memory trust
(active/tentative/deprecated); `confidence` = high/medium/low.

- [Chief Approvals](concepts/chief-approvals.md) — *active, high* — the approval
  routing model: agents never ask David directly, everything becomes a card.
- [Approval Load](concepts/approval-load.md) — *active, high* — how Chief bundles,
  prioritizes, and defers cards to keep David's queue short without weakening any gate.
- [Dashboard Maintenance](concepts/dashboard-maintenance.md) — *active, high* — the
  category of small, low-risk repo upkeep that comes out of periodic audits.
- [Vercel Status Checks](concepts/vercel-status-checks.md) — *active, medium* — the
  read-only pattern for Build checking real deploy/runtime state.
- [Tool Catalog](concepts/tool-catalog.md) — *tentative, medium* — governance-level
  classification of every tool in David's stack for agent access; first-pass, not yet
  through a Memory Review.
- [Second Brain Workflow](concepts/second-brain-workflow.md) — *active, medium* — how
  this vault itself is governed: layers, caps, priority order, safeguards.

## Lessons

Compact, behavior-changing rules — one file per lesson, not activity logs. See
`docs/AGENT_RUNBOOK.md` § **Lessons**.

- [Re-verify state before acting](lessons/reverify-state-before-acting.md) —
  *success-pattern, high confidence* — re-check real PR/branch state immediately
  before merging or presenting a card.
- [Bundle same-decision cards](lessons/bundle-same-decision-cards.md) —
  *orchestration-pattern, high confidence* — one card per shared decision, not one
  per finding.
- [GitHub stacked-branch auto-close](lessons/github-stacked-branch-autoclose.md) —
  *constraint, high confidence* — a PR auto-closes if its stacked base branch is
  deleted on merge.
- [Rebase-and-reopen recovery](lessons/rebase-and-reopen-recovery.md) —
  *recovery-pattern, high confidence* — how to recover from the constraint above.
- [Check code, not runbook prose](lessons/check-code-not-runbook-prose.md) —
  *failure-pattern, medium confidence* — verify the actual array/enum before
  referencing an indexed gate.
- *(Research pattern: none yet — no real Research workflow has run in this session.)*

## Projects

Active efforts.

- [True Crew Dashboard](projects/truecrew-dashboard.md) — *active, high* — the
  umbrella project: the product itself and its agent-mediated workflow.
- [Agent Readiness Audit — July 2026](projects/agent-readiness-july-2026.md) —
  *active, high* — gaps blocking agents from starting real work (board PRs +
  research-runner/ops checklist).
- [Dashboard Audit — July 2026](projects/dashboard-audit-july-2026.md) — *active,
  high* — the audit that produced PRs #75/#76/#77.
- [Second Brain Setup](projects/second-brain-setup.md) — *active, medium* — this
  vault, its own project.

## Decisions

One page per meaningful decision, each marked approved / pending / declined
(outcome), plus its own `confidence`.

- **Approved**, high confidence — [Dashboard maintenance bundle](decisions/dashboard-maintenance-bundle.md)
  (PRs #75/#76/#77, merged).
- **Pending**, medium confidence — [Vercel Preview secret scope](decisions/vercel-preview-secret-scope.md)
  (PR #78).
- **Pending**, high confidence — [Auth fix secret-rotation gate](decisions/auth-fix-secret-rotation.md)
  (PR #58).
- **Pending**, high confidence — [Agent Runbook adoption](decisions/agent-runbook-adoption.md)
  (PR #71 vs. this pass's fresh copy).

## Reference

Stable lookup pages — no narrative, just facts for a fast check during a real run.

- [Tool Access Quick Reference](reference/tool-access.md) — which agent, which tool,
  what access level, what gate.
- [Workflow Entry Points](reference/workflow-entry-points.md) — every Agent Workflow,
  trigger phrase, owner, gate.
- [Repair Playbook](reference/repair-playbook.md) — real degraded/blocked
  conditions: symptoms, detection signal, fix/workaround, when to retry the
  primary. Feeds the Reliability Agent's repair memory (still reserved).
- [Tool Fallback Chains](reference/tool-fallbacks.md) — ~10 critical tools' primary
  → fallback → degraded-path routing. Check before relying on a tool marked
  `DEGRADED`/`BLOCKED` in `docs/TOOL_CATALOG.md`.

## Sources

Raw-artifact notes, one per PR/runbook-section/experiment. Kept as links here (not
just a folder pointer) so every note is actually reachable from this page, per the
"no orphaned pages" safeguard.

- [PR #57 vs #58 — duplicate auth-trim fix](sources/pr-57-58-duplicate-auth-fix.md)
- [PR #71 — Agent Runbook created and installed](sources/pr-71-agent-runbook.md)
- [PR #75 — KnowledgePage table/empty-state fix](sources/pr-75-knowledgepage-fix.md)
- [PR #76 — duplicate util + dead export cleanup](sources/pr-76-dead-code-cleanup.md)
- [PR #77 — DataContext memoization fix](sources/pr-77-datacontext-memo-fix.md)
- [PR #78 — Vercel Preview secret-scope card](sources/pr-78-vercel-preview-secret-scope-card.md)
- [PR #79 — dashboard-maintenance bundle ApprovalCard](sources/pr-79-dashboard-maintenance-bundle-card.md)
- [Build ↔ Vercel read-only status-check experiment](sources/vercel-status-check-experiment.md)
- [Agent Runbook § Approval Load](sources/approval-load-runbook-section.md)
- [Second Brain governance rules added](sources/second-brain-governance-rules.md)

## Findings

Operator-filed Research lane outputs (V1). Distinct from `sources/` raw artifacts.

- [M&S estimating roadmap](findings/m-and-s/estimating-roadmap.md) — *draft / provisional* —
  target path for `start research on M&S estimating roadmap` → Knowledge status card.
- [Painter SaaS market scan](findings/m-and-s/painter-saas-market-scan.md) — *draft / provisional* —
  competitor features/pricing/performance scaffold for the V2 "Painter SaaS Market Scan" card
  (`req-ms-painting-v2-market-scan`).
- [TrueCrew design standard](findings/m-and-s/truecrew-design-standard.md) — *draft / provisional* —
  standardized TrueCrew formatting/color/layout scaffold for the V2 "TrueCrew Design Standard"
  card (`req-ms-painting-v2-design-standard`).

## Recent updates

- **2026-07-24** — Agent readiness audit filed:
  [projects/agent-readiness-july-2026.md](projects/agent-readiness-july-2026.md).
  Verdict: agents partially ready — merge PR #208 (and reconcile #180), then clear
  research-runner env + `research_requests` migration + one Start-research smoke
  approval. Build has no autonomous runner by design. Production Vercel env not
  probed in that pass (MCP unauthenticated).
- **2026-07-22** — Research lane live end to end: session-backed Research queue on
  Knowledge (⌘K `start research on <topic>` or Chief command), a Supabase-backed
  `research_requests` table + API for cross-device status, an approval card auto-releasing
  a request to `in_progress` when approved (the scheduled research runner's pickup signal —
  see `docs/RESEARCH_RUNNER.md`), and the V2 Upgrade Program board with two new
  research-linked workstreams. First three finding scaffolds filed under `findings/m-and-s/`.
- **2026-07-04** — Knowledge base refresh + free-tool research pass: added a Slice 2
  (Supabase Health Monitor, PR #59) pointer to
  [projects/truecrew-dashboard.md](projects/truecrew-dashboard.md)'s Open items
  (factual pointer only — this vault doesn't mirror live Obsidian priority state).
  Researched real 2026 free-tier quotas for ChatGPT, Gemini, DeepSeek, Kimi, GitHub
  Copilot, and current best local Ollama coding models, and recorded them in
  `docs/TOOL_CATALOG.md` (per-tool `notes`, with sources) and
  [reference/tool-fallbacks.md](reference/tool-fallbacks.md) (new "Credit-low mode —
  quick playbook" section + a researched-limits table). No tool was adopted, removed,
  or reinstalled — GitHub Copilot's free-tier facts are documented for reference only,
  its `removed` status in `docs/TOOL_CATALOG.md` is unchanged. See
  [log.md](log.md) for the full line-by-line record.
- **2026-07-04** — Reliability Agent fully defined (still reserved, not activated):
  `docs/AGENT_RUNBOOK.md` § Reliability Agent (purpose, responsibilities,
  boundaries, ownership under Chief), four health states (HEALTHY/DEGRADED/
  BLOCKED/PROBING) with transition rules, required cross-agent behavior, and a
  degradation/recovery/fallback event format. New
  [reference/repair-playbook.md](reference/repair-playbook.md), seeded with 3 real
  conditions (Vercel Preview secret gap, internal-auth 401s blocked on secret
  rotation, `chiefApprovalUrgency.ts` reserved-but-unused). No live automation, no
  dashboard UI, no code wiring — governance/memory only.
- **2026-07-04** — Layered-memory upgrade: added `MEMORY.md` (always-checked-first
  index), `reference/` (2 pages), and `lessons/` (superseding the earlier `patterns/`
  folder — 5 real lessons migrated to the new one-file-per-lesson schema). Normalized
  all 6 high-value concept pages into a compact playbook structure with
  `status`/`confidence`/`last_reviewed` fields; added the same fields to all 3
  projects and 4 decisions. Added a new **Memory Review Pass** workflow. See
  [log.md](log.md) for the full line-by-line record.
- **2026-07-04** — High-Value Learning Capture: added the policy, a required learning
  schema, a "Learning capture and promotion" end step on every Agent Workflow, and
  memory governance rules (active/tentative/deprecated, never silently deleted).
  *(Superseded by the layered-memory upgrade above — the six `patterns/` pages from
  this pass no longer exist; see `lessons/` instead.)*
- **2026-07-04** — Governance pass: hard caps, priority hierarchy, page-quality rules,
  and three safeguards added to `docs/AGENT_RUNBOOK.md`.
- **2026-07-04** — Second Brain Starter Pass (initial): vault created; 9 source notes,
  5 concept pages, 3 project pages, 4 decision pages seeded from real Build Log/PR
  history.
