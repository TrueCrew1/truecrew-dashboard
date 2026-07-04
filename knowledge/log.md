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
