# Knowledge Base Log

Append-only. One line per create/update, oldest first. Format:
`{{date}} — {{action}} — {{page}} — {{one-line reason/source}}`

Full session narrative lives in the Obsidian Build Log — this is the vault's own
lightweight ledger, not a duplicate of it.

---

## 2026-07-04 — Second Brain Starter Pass (initial)

- 2026-07-04 — created — `README.md`, `index.md`, `log.md` — vault skeleton.
- 2026-07-04 — created — `templates/concept-template.md`, `templates/project-template.md`, `templates/decision-template.md`, `templates/source-template.md` — starter templates.
- 2026-07-04 — created — `inbox/README.md` — placeholder so the empty folder is tracked.
- 2026-07-04 — created — `sources/pr-71-agent-runbook.md` — from PR #71 + Build Log entries on the Agent Runbook.
- 2026-07-04 — created — `sources/pr-75-knowledgepage-fix.md` — from PR #75 (dashboard audit).
- 2026-07-04 — created — `sources/pr-76-dead-code-cleanup.md` — from PR #76 (dashboard audit).
- 2026-07-04 — created — `sources/pr-77-datacontext-memo-fix.md` — from PR #77 (dashboard audit).
- 2026-07-04 — created — `sources/pr-79-dashboard-maintenance-bundle-card.md` — from PR #79 and the Build Log's bundle-card entries.
- 2026-07-04 — created — `sources/pr-57-58-duplicate-auth-fix.md` — from PR #57/#58 and their Build Log analysis entries.
- 2026-07-04 — created — `sources/pr-78-vercel-preview-secret-scope-card.md` — from PR #78 and its Build Log entry.
- 2026-07-04 — created — `sources/vercel-status-check-experiment.md` — from the real read-only Vercel MCP check run this session.
- 2026-07-04 — created — `sources/approval-load-runbook-section.md` — from `docs/AGENT_RUNBOOK.md` § Approval Load.
- 2026-07-04 — created — `concepts/approval-load.md` — synthesized from the Approval Load source note and its real applications this session.
- 2026-07-04 — created — `concepts/chief-approvals.md` — synthesized from the runbook and `agentApprovalGates.ts`.
- 2026-07-04 — created — `concepts/dashboard-maintenance.md` — synthesized from PRs #75/#76/#77 and the audit project page.
- 2026-07-04 — created — `concepts/vercel-status-checks.md` — synthesized from the Vercel status-check experiment source note.
- 2026-07-04 — created — `concepts/tool-catalog.md` — synthesized from the runbook's Tool Catalog and External Services Tool Catalog sections.
- 2026-07-04 — created — `projects/truecrew-dashboard.md` — umbrella project page for the whole dashboard effort.
- 2026-07-04 — created — `projects/dashboard-audit-july-2026.md` — project page for the July 2026 audit.
- 2026-07-04 — created — `projects/second-brain-setup.md` — project page for this vault itself.
- 2026-07-04 — created — `decisions/dashboard-maintenance-bundle.md` — status: approved.
- 2026-07-04 — created — `decisions/vercel-preview-secret-scope.md` — status: pending.
- 2026-07-04 — created — `decisions/auth-fix-secret-rotation.md` — status: pending.
- 2026-07-04 — created — `decisions/agent-runbook-adoption.md` — status: pending.
- 2026-07-04 — updated — `index.md` — linked all pages created in this pass.
- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` — added the Second Brain Starter Pass workflow and Knowledge Maintenance operating-rules section (not a `knowledge/` page itself, logged here since it governs this vault).

---

## 2026-07-04 — Governance pass (caps, priority order, safeguards)

Triggered by explicit request, not by new dashboard/governance work — checked
`gh pr list` and the branch's git log first; nothing had landed since the initial
pass, so this run added rules rather than ingesting new material.

- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` § Second Brain Starter Pass — added
  "Scope limits (first month)": hard caps (concepts ≤10, projects ≤5, decisions ≤15,
  sources ≤50), a 4-tier priority order, the "3–6 month" test, and a run-frequency
  rule (explicit ask or notable work only, no timer).
- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` § Knowledge Maintenance — added page
  quality rules and three named safeguards (no orphaned pages, no duplicate topics,
  no uncontrolled renaming), plus a tightened logging-discipline rule.
- 2026-07-04 — created — `sources/second-brain-governance-rules.md` — source note for
  this rule change itself.
- 2026-07-04 — created — `concepts/second-brain-workflow.md` — durable-pattern page
  for the vault's own governance (tier-2 priority: "Second Brain workflow itself").
- 2026-07-04 — updated — `projects/second-brain-setup.md` — new milestone entry,
  updated open items and current-count headroom.

---

## 2026-07-04 — Knowledge base refresh + free-tool research pass

Triggered by explicit request (global-standard knowledge-base + free-tool-fallback
task). No new pages created — all updates to existing pages, per "prefer updating
over duplicating." Two governance tensions flagged and resolved before acting (see
plan): Copilot's free-tier facts are documented for reference only, its `removed`
status is unchanged; Slice 2 gets a factual pointer, not a live tracker, since real
priority state stays in Obsidian per `MEMORY.md`'s existing disclaimer.

- 2026-07-04 — updated — `knowledge/projects/truecrew-dashboard.md` — added a Slice 2
  (Supabase Health Monitor, PR #59 / Vercel Deployment Protection blocker) pointer
  under Open items.
- 2026-07-04 — updated — `docs/TOOL_CATALOG.md` — added real, cited 2026 free-tier
  quotas/limits to `chatgpt-free`, `gemini-free`, `deepseek-free`, `kimi-free`
  (also filled in `launch_target` for the latter two, previously "not yet
  confirmed"); added Copilot free-tier facts to the existing `copilot` block's
  `notes` (status stays `removed` — reference only, not a reinstall proposal); added
  a non-binding Qwen3-Coder research note to `ollama-local`'s `notes` (no config
  change).
- 2026-07-04 — updated — `knowledge/reference/tool-fallbacks.md` — added a new
  "Credit-low mode — quick playbook" section (decision-tree table) and a researched
  free-tier-limits table under the free-tier AI overflow chain section, both citing
  real sources fetched this pass.
- 2026-07-04 — updated — `knowledge/index.md` — new "Recent updates" entry
  summarizing this pass.
- 2026-07-04 — reviewed, no change — `knowledge/MEMORY.md`,
  `knowledge/concepts/tool-catalog.md`, `knowledge/reference/tool-access.md` — access
  levels and the curated "check-first" index aren't affected by this pass.
- 2026-07-04 — pushed — commit `43834c2` on `docs/second-brain-starter-vault`, folded
  into the already-open PR #80 (per explicit choice: adding to #80 instead of a new
  stacked branch, since `main` has no `knowledge/`/`docs/TOOL_CATALOG.md` yet for a
  true standalone PR). `npm run qa` verified passing before push. Approval card
  presented for this pass; not yet merged — awaiting PR review/merge decision.
- 2026-07-04 — updated — `index.md` — added a "Vault size (at a glance)" table,
  linked the new concept page, and converted the Sources section from a folder
  pointer into direct links to all 10 source notes (closing a "no orphaned pages"
  gap that existed since the first pass).
- 2026-07-04 — **deferred (duplicate-topic decision, not a cap):** a standalone
  `concepts/agent-runbook.md` was considered and rejected — `concepts/chief-approvals.md`
  already covers the runbook's approval-routing content; a separate page would
  restate it under a different name. No page created.
- 2026-07-04 — **deferred (below the 3–6 month bar):** the 7 remaining dashboard-audit
  findings (beyond PRs #75/#76/#77) still don't have their own source notes — noted
  again as a candidate for a future pass, not created now.
- **Counts after this pass:** concepts 6/10, projects 3/5, decisions 4/15,
  sources 10/50. No caps were hit or approached.

---

## 2026-07-04 — Vault-first amendment + first recall-driven workflow run

- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` — added a mandatory "Second Brain
  check" (step 0) to every dashboard-touching workflow (Weekly Planner Pass, the new
  Dashboard Maintenance Pass, Daily Build Health Check, Research–Planner–Build
  Correlation Pass); added vault-pointer step to Chief Weekly Digest; added
  vault-aware rules to Planner/Build/Chief; added a new "Second Brain Usage" section
  stating the vault-first rule. No `knowledge/` page created or modified by this
  edit itself — this is a runbook-process change, logged here since it governs how
  agents use this vault.

### Vault recall (this run)

**Workflow:** Weekly Planner Pass, run immediately after the amendment above, to prove
the pattern rather than just document it.

**Pages consulted:**
- `index.md`
- `projects/truecrew-dashboard.md`
- `concepts/dashboard-maintenance.md`
- `decisions/agent-runbook-adoption.md` (pending)
- `decisions/dashboard-maintenance-bundle.md` (**approved** — PRs #75/#76/#77 merged)
- `decisions/vercel-preview-secret-scope.md` (pending)
- `decisions/auth-fix-secret-rotation.md` (pending)

**How it shaped the run:** recalling `dashboard-maintenance-bundle.md` surfaced that
PR #75 already fixed the table/empty-state half of "Knowledge-page polish" — a gap
the Obsidian `Current Priority List.md` still listed as fully open (note dated
2026-07-02, predates PR #75). Corrected that doc directly, citing PR #75 and this
vault page, rather than re-deriving the state from scratch or leaving the stale note
as-is. Also avoided a miss the other direction: did **not** add anything about the
Second Brain vault itself (PR #80) to that same doc, since its own stated scope rule
("NOT knowledge system") excludes it — confirmed by reading the doc, not assumed.

**Outcome:** no new `ApprovalCard` — a routine documentation sync against an
already-verified fact, per the workflow's own auto-resolvable bucket. Full details in
the Obsidian Build Log entry "Second Brain vault made the memory layer for dashboard
workflows."

---

## 2026-07-04 — High-Value Learning Capture added; first pattern entries seeded

- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` — added § High-Value Learning
  Capture (policy, event-log-vs-memory split, six pattern types, required learning
  schema, memory-worth mechanics, per-agent coverage, retrieval discipline, memory
  governance); added a Patterns cap (≤10) to Second Brain Starter Pass's scope
  limits; added a "Learning capture and promotion" end step to all 8 Agent Workflows;
  carved a narrow exception into "Read freely, write narrowly" so a workflow's own
  Learning capture step may append to an **existing** `patterns/*.md` page directly
  (new pattern pages still require a Second Brain Starter Pass).
- 2026-07-04 — created — `templates/learning-template.md` — the required entry shape.
- 2026-07-04 — created — `patterns/winning-patterns.md` — 1 entry: re-verify real
  state immediately before acting, not just at discovery time. Confidence: high.
  Memory worth: success_uses 0, failure_uses 0 (counters start fresh per policy).
- 2026-07-04 — created — `patterns/failure-patterns.md` — 1 entry: trusting runbook
  prose over actual code state when drafting a gate reference (the
  `APPROVAL_GATES.build[3]` out-of-bounds bug on PR #78, caught before shipping).
  Confidence: medium. Review horizon: review after `agent-runbook-adoption` resolves.
- 2026-07-04 — created — `patterns/constraints.md` — 1 entry: GitHub auto-closes a PR
  when its stacked base branch is deleted on merge (PR #65, discovered via PR #64's
  merge). Confidence: high.
- 2026-07-04 — created — `patterns/recovery-patterns.md` — 1 entry: rebase the
  orphaned commit onto `main` and reopen as a new PR (PR #65 → #66). Confidence: high.
- 2026-07-04 — created — `patterns/approval-orchestration-patterns.md` — 1 entry:
  bundle same-decision findings into one `ApprovalCard` (validated at PRs #75/#76/#77
  and the 13-PR stale-cleanup batch). Confidence: high.
- 2026-07-04 — created — `patterns/research-patterns.md` — **0 entries**, honestly
  noted: no real (non-illustrative) Research workflow has run in this session yet, so
  no real learning exists to seed. Left empty rather than fabricated.
- 2026-07-04 — updated — `index.md` — added a "Patterns" section, a Patterns row to
  the vault-size table, and this pass to Recent updates.
- 2026-07-04 — updated — `README.md` — added `patterns/` to the folder-layout table
  and a pointer to § High-Value Learning Capture.
- **Counts after this pass:** concepts 6/10, projects 3/5, decisions 4/15,
  sources 10/50, **patterns 6/10** (new category). No caps hit or approached.
- **Note on this pass's own nature:** this is a retrospective seeding pass across
  real session history (PRs #64–#79 and the surrounding Build Log), not a single
  narrow workflow invocation — each entry names its actual originating
  workflow/moment precisely in its `Workflow:` field rather than being force-fit
  under one label.

---

## 2026-07-04 — Layered-memory upgrade: MEMORY.md, lessons/, reference/, playbook pages

Supersedes the `patterns/` design from the previous pass with a leaner,
one-file-per-lesson model, adds a top-level always-checked-first index, adds a
`reference/` layer, and normalizes the 6 high-value concept pages into compact
playbooks. Full reasoning in the Obsidian Build Log entry of the same name.

- 2026-07-04 — created — `MEMORY.md` — small, curated, always-checked-first index
  (active priorities, core concepts, current projects, active decisions, high-value
  lessons, stable references — one line each).
- 2026-07-04 — **removed** — `patterns/winning-patterns.md`,
  `patterns/failure-patterns.md`, `patterns/constraints.md`,
  `patterns/recovery-patterns.md`, `patterns/approval-orchestration-patterns.md`,
  `patterns/research-patterns.md`, `templates/learning-template.md` — deliberately
  superseded, not silently dropped: content migrated to individual `lessons/*.md`
  files under the new schema (see below).
- 2026-07-04 — created — `lessons/reverify-state-before-acting.md` (success-pattern,
  confidence high) — migrated from `patterns/winning-patterns.md`.
- 2026-07-04 — created — `lessons/check-code-not-runbook-prose.md` (failure-pattern,
  confidence medium) — migrated from `patterns/failure-patterns.md`.
- 2026-07-04 — created — `lessons/github-stacked-branch-autoclose.md` (constraint,
  confidence high) — migrated from `patterns/constraints.md`.
- 2026-07-04 — created — `lessons/rebase-and-reopen-recovery.md` (recovery-pattern,
  confidence high) — migrated from `patterns/recovery-patterns.md`.
- 2026-07-04 — created — `lessons/bundle-same-decision-cards.md`
  (orchestration-pattern, confidence high) — migrated from
  `patterns/approval-orchestration-patterns.md`.
- 2026-07-04 — created — `templates/lesson-template.md` — the new lesson schema
  (title, status, confidence, source_workflow, source_agent, category, rule, why,
  apply_when, avoid_when, check_first, related_pages, related_prs, last_reviewed).
- 2026-07-04 — created — `reference/tool-access.md` — stable lookup table, distilled
  from `concepts/tool-catalog.md` and the runbook's Tool Catalog sections.
- 2026-07-04 — created — `reference/workflow-entry-points.md` — every Agent Workflow,
  trigger phrase, owner, gate, at a glance (includes the new Memory Review Pass).
- 2026-07-04 — updated — all 6 `concepts/` pages (`chief-approvals`, `approval-load`,
  `dashboard-maintenance`, `vercel-status-checks`, `tool-catalog`,
  `second-brain-workflow`) — normalized into the playbook structure (Summary / What
  works / What to check first / Open questions / Related), added `confidence` and
  `last_reviewed` front-matter fields, `status` standardized to
  active/tentative/deprecated vocabulary. `tool-catalog` marked `tentative`
  (first-pass, not yet through a Memory Review); the other 5 marked `active`.
- 2026-07-04 — updated — all 3 `projects/` pages — added `confidence` and
  `last_reviewed` fields; `dashboard-audit-july-2026`'s `status` value normalized
  from `mostly-complete` to `active` (memory-trust axis, not project-lifecycle
  phase — the project's completion status stays described in its own "Current
  status" prose).
- 2026-07-04 — updated — all 4 `decisions/` pages — added `confidence` and
  `last_reviewed` fields; `status` (approved/pending/declined, the decision-outcome
  axis) left unchanged, since it's a different axis from memory trust.
- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` — new § Memory Architecture (5
  layers, MEMORY.md's role, the 0a/0b/0c retrieval order); § Lessons replacing §
  High-Value Learning Capture's pattern-page mechanics; § Memory Governance
  trimmed and pointed at the new Memory Review Pass workflow; new **Memory Review
  Pass** workflow added to Agent Workflows; every dashboard/knowledge-changing
  workflow's Second Brain check updated to read `MEMORY.md` first; Second Brain
  Usage strengthened with a hard citation requirement (name the exact pages
  consulted; name the page a "follows an existing pattern" claim refers to);
  Knowledge Maintenance gained "Required front-matter fields" and "Playbook pages"
  subsections; caps updated (Lessons ≤20, Reference ≤10, replacing Patterns ≤10).
- 2026-07-04 — updated — `knowledge/README.md` — rewritten around the five-layer
  model and `MEMORY.md` as the entry point.
- 2026-07-04 — updated — `knowledge/index.md` — MEMORY.md pointer added; "Patterns"
  section replaced with "Lessons"; new "Reference" section; vault-size table updated
  (Lessons 5/20, Reference 2/10); status/confidence shown inline for concepts,
  projects, and decisions.
- 2026-07-04 — updated — `templates/concept-template.md`,
  `templates/project-template.md`, `templates/decision-template.md` — added
  `confidence`/`last_reviewed`; concept template restructured to the playbook shape.
- **Counts after this pass:** concepts 6/10, projects 3/5, decisions 4/15,
  sources 10/50, **lessons 5/20**, **reference 2/10**. No caps hit or approached.

---

## 2026-07-04 — Chief Intake Rule added; MEMORY.md clarified

- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` — new § **Chief Intake Rule**:
  before any planning/execution, read `knowledge/MEMORY.md`,
  `01_DASHBOARD/Current Priority List.md`, and the active-task doc; name the active
  Priority and Current Task at the top of every response; refuse off-priority work
  without explicit direction; state plainly (don't silently pick) when the Priority
  List and active-task doc disagree.
- 2026-07-04 — updated — `MEMORY.md` — added a clarifying note that its own "Active
  priorities" section is vault-internal decisions, not a substitute for reading the
  real dashboard Priority List/active-task doc in Obsidian.
- **Real finding from running this intake for the first time:** `Current Priority
  List.md` shows no Track A priority queued ("awaiting next assignment"), while
  `active-task-truecrew-dashboard.md` still names **Slice 2 — Supabase Health
  Monitor** (PR #59) as the Current Task, blocked on a Vercel Deployment Protection
  setting. Also surfaced: recent Second Brain vault work (this and prior passes)
  serves neither document — flagged explicitly per the new rule rather than left
  implicit.

---

## 2026-07-04 — Master Priority List wired into MEMORY.md

- 2026-07-04 — updated — `MEMORY.md` — "Active priorities" clarifying note now also
  points at `True Crew/Master Priority List.md` (top-level, cross-project: Dashboard
  → Painting App V2 → Targets/Growth), alongside the dashboard-internal Current
  Priority List and active-task doc.
- Resolves the tension flagged in the prior Chief Intake entry: the dashboard's own
  Current Priority List showing "nothing queued" and the active-task doc showing
  Slice 2 as current were both correct, at different altitudes — Priority 1
  (Dashboard) is active; Slice 2 is its Current Task; no *Track A* item happens to be
  queued within it right now.

---

## 2026-07-04 — Tool Catalog cross-referenced (docs/TOOL_CATALOG.md is now authoritative)

- 2026-07-04 — updated — `concepts/tool-catalog.md` — added a pointer to the new
  `docs/TOOL_CATALOG.md` (repo `docs/`, not this vault) as the single
  stable, schema-driven, appendable tool record; this concept page's reasoning and
  the runbook's Tool Catalog sections feed it, they don't duplicate it.
- 2026-07-04 — updated — `reference/tool-access.md` — same pointer; noted that if
  the two ever disagree, `docs/TOOL_CATALOG.md` wins (it's the more granular,
  more frequently updated record).
- Flagged, per Chief Intake/Scope Guardrail before this work started: the broader
  Tool System request (catalog + live Tool Launcher UI + a new Reliability agent)
  didn't unblock the active Current Task (Slice 2). David chose to do the
  governance/docs groundwork now and hold the live UI build until Slice 2 unblocks —
  this entry covers only the groundwork; no dashboard UI code changed.

---

## 2026-07-04 — Reliability Agent fully defined (reserved) + Repair Playbook created

- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` — § Reliability Agent added in full
  (purpose, responsibilities, boundaries, ownership under Chief, four health states
  with transition rules, required cross-agent behavior, event format). Still
  reserved — no code/gate/workflow wiring.
- 2026-07-04 — created — `reference/repair-playbook.md` — compact repair-memory
  schema, seeded with 3 real entries: Vercel Preview `INTERNAL_API_SECRET` gap
  (active, pending decision), internal-auth 401s blocked on secret rotation
  (active, pending David's confirmation), `chiefApprovalUrgency.ts`
  reserved-but-unused (active, intentional — not an incident).
- 2026-07-04 — updated — `MEMORY.md`, `index.md`, `reference/tool-access.md` —
  cross-linked the new repair-playbook page; vault-size table updated
  (Reference 2/10 → 3/10).
- **Counts after this pass:** concepts 6/10, projects 3/5, decisions 4/15,
  sources 10/50, lessons 5/20, **reference 3/10**. No caps hit or approached.
- No dashboard UI or app code changed — governance/memory only, per the explicit
  boundary in this task.

---

## 2026-07-04 — Tool fallback chains added; reliability-aware agent behavior wired in

- 2026-07-04 — updated — `docs/TOOL_CATALOG.md` — added `health_state` field to all
  21 entries (default `HEALTHY`).
- 2026-07-04 — created — `reference/tool-fallbacks.md` — fallback chains for 10
  critical, real tools (claude-code, github, vercel, supabase, obsidian-buildlog,
  perplexity-pro, claude-pro, cursor, sentry, free-tier AI overflow group).
  Supabase's chain documents an already-shipped app-level fallback
  (`mergeWithMockFallback`/mock mode), not a proposed new one.
- **Deliberately not created:** fallback entries for PostHog, Resend, Inngest,
  Drizzle, Zod, Figma, Stripe, QuickBooks, Google Workspace, OneDrive — none are
  confirmed in `docs/TOOL_CATALOG.md`, `CLAUDE.md`, or `package.json`. Logged as
  gaps in `tool-fallbacks.md` rather than fabricated.
- 2026-07-04 — updated — `MEMORY.md`, `index.md` — cross-linked `tool-fallbacks.md`;
  vault-size table updated (Reference 3/10 → 4/10).
- 2026-07-04 — updated — `docs/AGENT_RUNBOOK.md` — Required Agent Behavior gains
  "use the next approved fallback" and "return to primary once HEALTHY"; each
  agent's own verification checklist gets a one-line reliability-aware
  cross-reference; 5 workflows (Weekly Planner Pass, Dashboard Maintenance Pass,
  Daily Build Health Check, Weekly Research Scan, Correlation Pass) gain a compact
  "Tool health check" step.
- **Counts after this pass:** concepts 6/10, projects 3/5, decisions 4/15,
  sources 10/50, lessons 5/20, **reference 4/10**. No caps hit or approached.
- No dashboard UI or app code changed — governance/memory only, per the explicit
  boundary in this task.

---

## 2026-07-04 — VS Code/editor tool routing (honored existing stack decision, not reversed)

- 2026-07-04 — updated — `docs/TOOL_CATALOG.md` — added a `status` field to every
  entry (fully-wired/partially-wired/launch-only/manual/future-integration/removed);
  added `continue-dev` as its own real AI entry; added `copilot`/`cline`/
  `cline-nightly` marked `status: removed`, with the 2026-07-03 removal reasoning
  cited directly in the catalog.
- 2026-07-04 — updated — `reference/tool-fallbacks.md` — added a Tiers section and
  a best-use-by-task-type table; tightened `claude-pro`/`perplexity-pro` fallback
  triggers to name "credits low" explicitly plus a return-to-primary rule; added a
  `continue-dev` entry as the always-available low-cost lane.
- 2026-07-04 — updated — `CLAUDE.md` (repo root) — new "Tool routing" section,
  pointing to the global VS Code stack decision and `docs/TOOL_CATALOG.md` rather
  than duplicating either.
- **Real conflict caught and flagged before acting:** the task asked to add support
  for Cline, Cline Nightly, and Copilot as editor tools. Checked
  `.vscode/settings.json` (no AI-extension config present) and persistent memory —
  both confirmed these were deliberately removed from this exact workspace on
  2026-07-03, twice for Cline. Did not silently reinstate them; flagged the
  conflict explicitly and honored the existing, more precise decision, per the
  task's own "unless the repo already documents them more precisely" clause.
- New `.vscode/extensions.json` — recommends the two decided extensions
  (`anthropic.claude-code`, `continue.continue`); lists Cline/Cline Nightly/Copilot
  as `unwantedRecommendations` so the workspace itself encodes the decision.
- **Did not create** a new `AGENTS.md` — would duplicate `docs/AGENT_RUNBOOK.md` and
  `docs/AGENT_WORKFLOW.md`, which already serve that purpose in this repo.
- No dashboard UI or app code changed; no new VS Code extension was actually
  installed by this pass — governance/docs only.

---

## 2026-07-13 — Work Story / Research Activity system documented

- 2026-07-13 — updated — `projects/truecrew-dashboard.md` — added a "Work Story / Research Activity system" subsection naming its canonical files (`workStories.ts`, `requests.ts`, `latestResearchSource.ts`, `AgentWorkBoard.tsx`) and current Live/Structured status, after the system was found independently duplicated on an unmerged branch and reconciled.
