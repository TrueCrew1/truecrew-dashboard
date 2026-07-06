# Documentation Audit — July 2026

Read-only audit of `/docs`, `CLAUDE.md`, and `README.md` against the current on-disk
state of the repo (including uncommitted working-tree changes, which is what an agent
session actually sees). Produced by the True Crew Documentation Agent.

## Summary table

| File | Covers | Status | Owner | Priority |
|---|---|---|---|---|
| `CLAUDE.md` | Product context, coding preferences, tone, workflow pointers, tool routing | GOOD | Content | LOW |
| `README.md` | Stack table, quick start, deploy steps, env vars, API/app routes, legacy notes | GOOD | Content | LOW |
| `docs/AGENT_ENTRY_POINTS.md` | Per-role fast index into `AGENT_RUNBOOK.md` sections | GOOD | Content | LOW |
| `docs/AGENT_RUNBOOK.md` | Full agent operating contract (Planner/Build/Research/Content/Chief, Reliability, workflows, memory) | GOOD | Content | LOW |
| `docs/AGENT_WORKFLOW.md` | Agent ↔ approver roles, PR checklist, Obsidian bootstrap | GOOD | Content | LOW |
| `docs/APPROVAL_ALERTS_INSPECTION.md` | Inspection of approval-alert surfaces; Phase 4 urgency status | GOOD | Build | LOW |
| `docs/APPROVAL_ALERTS_PLAN.md` | Read-only Approval Alerts panel slice (shipped) | **NEEDS UPDATE** | Build | MEDIUM |
| `docs/APPROVAL_ALERTS_PREP.md` | Prep note, self-marked superseded | **NEEDS UPDATE** | Content | LOW |
| `docs/APPROVAL_REQUEST_PATH_DESIGN.md` | No-code submission path design for Planner/Research/Content approval requests | **NEEDS UPDATE** | Build | **HIGH** |
| `docs/DEPLOY_NOW.md` | 5-minute deploy guide (Supabase → Vercel → GitHub Actions) | **NEEDS UPDATE** | Content | LOW |
| `docs/DEV_AGENT_ROUTING.md` | Dev-tool lane routing (Primary Claude / VS Claude / Kimi / Zed / Continue) | GOOD | Content | LOW |
| `docs/OBSIDIAN_LOGGING.md` | Local-first Obsidian logging plan, CLI reference | GOOD | Content | LOW |
| `docs/PR_SUMMARY_TEMPLATE.md` | Standard PR description template | GOOD | Content | LOW |
| `docs/TOOL_CATALOG.md` | Stable per-tool registry (schema, health state, access) | GOOD | Build | LOW |
| `docs/VERCEL_SUPABASE_SETUP.md` | Full production deploy guide, architecture, API routes, troubleshooting | **NEEDS UPDATE** | Content | LOW |
| `docs/ZED_AGENT_PROMPTS.md` | Zed agent-panel prompt pack (scan/implement/handoff) | GOOD | Build | LOW |
| `docs/logging-slices.md` | Current logging state + "add structured logging to one surface" pattern | GOOD | Content | LOW |
| `docs/agents/.claude/settings.local.json` | Claude Code permission allowlist | **NEEDS UPDATE** | Build | MEDIUM |
| `docs/vault-templates/10_INTEGRATIONS/GitHub-Workflow.md` | Obsidian vault seed template — ops checklist | GOOD | Content | LOW |
| `docs/vault-templates/True Crew/Agent Workflow.md` | Obsidian vault seed template — agent/approver quick reference | GOOD | Content | LOW |

## Conflicts & notable findings

### 1. `docs/APPROVAL_REQUEST_PATH_DESIGN.md` contradicts shipped code — HIGH
The doc's banner reads *"Status: proposal only. No `src/` files touched. Wait for
'APPROVED DESIGN' before implementing"* and it closes with *"Send 'APPROVED DESIGN'...
to proceed to implementation."* But the design is already built:
- `src/lib/agentApprovalRequests.ts` exists and explicitly cites this doc in its own
  top comment.
- It's wired into `src/components/chief/ChiefPanel.tsx` via
  `loadSubmittedAgentApprovalCards`.
- `public/approval_requests.json` (the proposed data file) exists.

**Fix:** add a status banner (same pattern already used in
`APPROVAL_ALERTS_INSPECTION.md`/`APPROVAL_ALERTS_PLAN.md`) confirming this shipped, and
remove or annotate the stale "send APPROVED DESIGN" call-to-action so a new agent
session doesn't treat an implemented feature as still pending sign-off.

### 2. `docs/APPROVAL_ALERTS_PLAN.md` — stale trailing instruction vs. its own status banner — MEDIUM
The top of the file says *"Status (2026-07-05): Shipped, merged to `origin/main`."*
(verified — `ApprovalAlertsPanel.tsx` and `useApprovalAlerts.ts` exist). But the file's
last line still reads *"After creating the file, stop. Do not implement the feature
yet. Show me the diff for `docs/APPROVAL_ALERTS_PLAN.md` only."* A session that reads
linearly and stops at the bottom, or greps only the last section, could act on stale
guidance. **Fix:** remove the trailing instruction now that the status banner
supersedes it.

### 3. `docs/APPROVAL_ALERTS_PREP.md` is dead scaffold — LOW
Marked `status: superseded`; every line just redirects to
`APPROVAL_ALERTS_INSPECTION.md` / `APPROVAL_ALERTS_PLAN.md`. Carries no unique content.
**Fix:** Content/Chief should decide whether to delete it outright or keep it as a
permanent one-line tombstone — leaving it as-is invites a future pass to "fill it in"
against its own explicit instruction not to.

### 4. `docs/agents/.claude/settings.local.json` is misplaced, not a doc — MEDIUM
This is a Claude Code permission-allowlist file (Bash command allowlist,
`additionalDirectories`), nested under `docs/agents/.claude/`. Repo-root `.claude/`
already holds the real, active `settings.local.json`, `project-rules.md`, and
`workflow-checklists.md` — this second copy under `/docs` looks like a stray artifact
from an earlier agent session rather than intentional documentation. **Fix:** Build
should confirm whether `docs/agents/` is meant to hold anything at all; if not, this
should move to repo root or be removed.

### 5. `docs/AGENTS_README.md` (root-level, referenced by `/docs`) is empty — MEDIUM, out of strict scope
Not inside `/docs` itself (`AGENTS_README.md` lives at repo root, alongside `AGENTS.md`),
so it isn't scored in the table above, but `docs/DEV_AGENT_ROUTING.md` names it as a
"required pre-read" before any logging/Monitor/Approvals change and it is currently
0 bytes. `DEV_AGENT_ROUTING.md` already self-flags this as an unresolved open question —
this audit confirms the file is still empty and the gap is still live.

### 6. Deploy docs duplicated across two files — LOW
`docs/DEPLOY_NOW.md` and `docs/VERCEL_SUPABASE_SETUP.md` both document the same
Supabase → Vercel → GitHub-webhook deploy flow, at different levels of detail
(5-minute quick path vs. full reference with troubleshooting). Not contradictory today,
but two sources of truth for the same process can silently drift. **Fix:** consider
folding `DEPLOY_NOW.md`'s quick-start steps into `VERCEL_SUPABASE_SETUP.md` as a "TL;DR"
section, or clearly mark one as canonical and the other as a derived quick-reference.

### No structural conflicts with `/src`
Cross-checked file/module references across `AGENT_RUNBOOK.md`, `TOOL_CATALOG.md`,
`APPROVAL_ALERTS_INSPECTION.md`, and `CLAUDE.md` against the actual repo tree
(`src/components/chief/agentApprovalGates.ts`, `lib/stage-change.ts`,
`src/lib/monitor/log.ts`, `.claude/project-rules.md`, `src/context/DataContext.tsx`,
etc.) — all exist and match. `CLAUDE.md`'s "follow existing structure" list doesn't
name every `src/` subdirectory (`monitor/`, `hooks/`, `routes/`, `data/` exist but
aren't listed), but that list was never presented as exhaustive, so this isn't scored
as a conflict.

### Uncommitted state at time of audit
`docs/AGENT_RUNBOOK.md`, `APPROVAL_ALERTS_INSPECTION.md`, `APPROVAL_ALERTS_PLAN.md`,
`APPROVAL_ALERTS_PREP.md`, `TOOL_CATALOG.md`, and `VERCEL_SUPABASE_SETUP.md` had
uncommitted edits in the working tree when this audit ran (`git diff --stat`
confirmed); this audit reflects that current on-disk content, not the last commit.
