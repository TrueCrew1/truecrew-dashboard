# Agent & Bot Compliance Plan

## Summary

This repo has real, working agent governance today — `docs/AGENT_RUNBOOK.md`,
`docs/AGENT_WORKFLOW.md`, `docs/TOOL_CATALOG.md`, `docs/AGENT_TOOL_LANES.md`,
and `docs/agents/CHIEF_OPERATING_SYSTEM.md` — but all of it governs **people
and AI coding sessions** (Claude Code, Chief, GPT-5-mini/Kimi/DeepSeek,
Ollama). None of it governs **GitHub-native bots/service accounts**: a
GitHub App, a machine user, or a scheduled Action that authenticates as its
own identity and can comment, label, or push independently of a human
approving each action in-session.

Right now there are zero such actors installed against this repo, as far as
repo evidence shows (see below). That's a reasonable place to be for a
pre-revenue, single-maintainer project — but the moment any bot gets
write access (even PR-comment write), it needs the same kind of explicit
least-privilege classification this repo already gives Claude Code, Chief,
and the external models. This doc is that classification, written before any
bot exists, so none gets added ad hoc.

This is a **docs-only, audit-driven deliverable**. It does not install,
configure, or authorize any bot. It proposes what should exist, what
permissions each would need, what governance must be true first, and a
phased rollout — Phase 0 (audit, this doc) through Phase 3 (limited
write-back), gated on the repo actually being ready for each phase.

## Current Repo Evidence

Inspected directly (branch `feat/chief-v1-standup`, working tree dirty at
inspection time — see Open Questions):

**Workflows (`.github/workflows/`, 3 files, all human/CI-triggered, none
write back to the repo):**

| File | Trigger | What it does | Writes to repo? |
|---|---|---|---|
| `ci.yml` | push to `main`/`cursor/**`, PR to `main` | `npm ci && npm run build` | No |
| `deploy-vercel.yml` | push to `main`, manual dispatch | Vercel prebuilt prod deploy + health check, guarded by a secrets-presence check that no-ops if `VERCEL_TOKEN` is unset | No — deploys, does not commit |
| `supabase-migrate.yml` | push to `main` touching `supabase/migrations/**`, manual dispatch | `supabase db push`, same secrets-guard pattern | No — migrates a DB, does not commit |

All three use the default `GITHUB_TOKEN` implicitly (none reference a PAT or
App token) and `actions/checkout@v4` only — no job opens a PR, pushes a
commit, or writes a file back to the tree.

**No automation surface found for:**
- Dependabot (`.github/dependabot.yml` — absent)
- CODEOWNERS (absent)
- `.coderabbit.yaml` — **referenced in four docs** (`docs/agents/
  CHIEF_OPERATING_SYSTEM.md`, `docs/prompts/deepseek-triage.md`,
  `docs/prompts/ollama-experiment.md`, `docs/prompts/gpt5mini-quick-edit.md`,
  and `CONTRIBUTING.md`) as an existing automated PR-review gate, but the
  config file itself does not exist in this repo checkout. Either it lives
  only in the GitHub-side app install (no local config needed) or the
  integration is aspirational and not yet wired — can't tell from repo
  evidence alone (see Open Questions).
- Any branch protection / ruleset config (not repo-visible by nature — GitHub
  Settings, not a file)
- Any scheduled/cron workflow
- Any workflow with `contents: write`, `pull-requests: write`, or similar
  elevated `permissions:` block (none of the three workflows declares a
  `permissions:` key at all, meaning they run at whatever the org/repo
  default is — itself worth checking, see Open Questions)

**Existing governance that *does* exist, and what it does and doesn't
cover:**
- `docs/AGENT_RUNBOOK.md`, `docs/AGENT_WORKFLOW.md` — the Chief/Claude
  Code/Build-Planner-Research-Content agent contract. Governs *session*
  behavior (what an agent may do without asking, what needs an
  `ApprovalCard`). Silent on GitHub bot identities.
- `docs/TOOL_CATALOG.md`, `docs/AGENT_TOOL_LANES.md` — machine-readable tool
  classifications (`AGENT-ELIGIBLE` / `HUMAN-ONLY`, access levels). The
  `github` row classifies **Claude Code's own use of `gh`/web** (READ-ONLY
  browsing; EXECUTE-WITH-APPROVAL for merge/close) — this is a human-in-the-
  loop coding session's access, not a bot's.
- `docs/agents/CHIEF_OPERATING_SYSTEM.md` § 6 Safety — "Only Claude Code
  edits this repo" and every other model/tool "act[s] via proposals and
  scripts only... none of them commit, push, or merge directly." This is the
  clearest existing statement of the principle this doc extends to bots:
  *no non-human actor writes to this repo directly today, on purpose.*
- `CONTRIBUTING.md` — confirms the repo is closed (not open source), all
  changes go through PRs, no direct pushes to `main`, and names the current
  tool chain as Chief (approval router) + Claude Code (implementer) +
  CodeRabbit (automated review).
- `SECURITY.md` — closed-repo posture, no execution of untrusted PR code
  against protected resources without manual review first.
- `docs/AGENT_RUNBOOK.md:1155` — explicitly lists "GitHub repo/org
  permissions (collaborators, branch protection)" as **HUMAN-ONLY**, i.e.
  access-control changes are already fenced off from any agent, coding
  session or bot.

**Net finding:** the repo's governance culture (PR-only, least-privilege,
human-only for access control, no direct commits from non-human actors) is
already the right starting posture for bots too — this plan operationalizes
it for GitHub-native automation specifically, rather than introducing a new
philosophy.

## Recommended Bot Roles

Scoped to what a pre-revenue, single-maintainer SaaS repo with an existing
Vercel+Supabase CI/CD pipeline actually needs next — not a generic enterprise
bot roster.

1. **repo-health bot** — stale branch/PR hygiene, weekly summary (open PRs
   idle >N days, branches with no commits in M days, open issues untriaged).
   Justified because `docs/agents/CHIEF_OPERATING_SYSTEM.md` § 6 already
   flags "no deleting superseded branches/PRs without verifying the feature
   was actually ported" as a live risk today, done manually. A read-only
   summary bot reduces that risk without taking the deletion decision away
   from a human.

2. **dependency/security bot (Dependabot)** — the most conventional gap:
   there is no `.github/dependabot.yml` at all, so `package.json`
   dependencies (`react`, `vite`, `@supabase/supabase-js`, `@vercel/node`,
   etc.) get no automated vulnerability or version-drift signal today.
   Justified purely by absence — this is the single highest-value,
   lowest-risk addition available, since GitHub's own Dependabot is a
   platform-native, no-token-needed integration by default (security updates
   need no PAT at all; version-update PRs use GitHub's own bot identity, not
   a repo secret).

3. **docs/governance bot** — checks that the cross-referencing doc set
   (`AGENT_RUNBOOK.md`, `TOOL_CATALOG.md`, `AGENT_TOOL_LANES.md`,
   `CHIEF_OPERATING_SYSTEM.md`, this file) doesn't silently drift — e.g. flag
   if a doc is edited without its cross-referenced siblings being touched in
   the same PR, or if `.coderabbit.yaml` is referenced but still missing (see
   Open Questions — this bot would have caught that today). Justified
   because this repo's governance is unusually doc-heavy and
   cross-referential by design; that's a maintenance burden a bot can carry
   more reliably than a human remembering to check five files.

4. **release/deploy bot** — **not recommended as a new addition.**
   `deploy-vercel.yml` and `supabase-migrate.yml` already cover this ground
   adequately for current scale, gated by secret-presence checks that no-op
   safely when unconfigured. Adding a distinct "release bot" identity on top
   would duplicate existing, working automation without a clear gap to
   justify it. Revisit only if release cadence grows to need changelog
   generation, semantic-version tagging, or multi-environment promotion.

5. **Chief advisory bot** — **not recommended to extend to GitHub write
   surfaces yet.** Chief today is deliberately in-app only
   (`docs/agents/CHIEF_OPERATING_SYSTEM.md` § 1–2) and never touches GitHub
   directly; `ApprovalCard`s are the only interface to David. A GitHub-facing
   "Chief comments on PRs" bot would be a genuine scope expansion, not a
   docs/audit gap — it needs an explicit product decision first, not a
   default recommendation from this compliance pass.

## Permission Matrix

| Bot | Auth Model | Repo Permissions | Write Scope | PR Only? | Secrets Needed | Risk Level |
|---|---|---|---|---|---|---|
| repo-health bot | GitHub App (fine-grained, org-installed) | `metadata: read`, `pull-requests: read`, `issues: read`; **no contents/write scope at all** | None — posts a summary (issue comment, Slack/email, or scheduled artifact) | N/A (no PRs opened) | None beyond the App's own installation token (GitHub-managed, no PAT) | Low |
| dependency/security bot (Dependabot) | GitHub-native, platform-managed (not a PAT/App you provision) | `contents: write` (its own PRs only), `pull-requests: write` | Opens PRs only, never pushes to `main` directly | Yes | None — Dependabot uses its own GitHub-internal credential, not a repo secret | Low |
| docs/governance bot | GitHub App (fine-grained) or Action using default `GITHUB_TOKEN` | `contents: read`, `pull-requests: write` (to comment) | Comments only; can be scoped to open a PR for a doc-sync fix if desired later, but starts comment-only | Yes (if it ever writes) | None beyond default `GITHUB_TOKEN` if implemented as an Action | Low |
| release/deploy bot | *Not recommended now* — existing `deploy-vercel.yml`/`supabase-migrate.yml` cover this via repo secrets (`VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, etc.), already scoped to `main`-only triggers | n/a | n/a | n/a | Already provisioned (see `.env.example`, existing workflow secrets) | Low (status quo), unassessed if expanded |
| Chief advisory bot (GitHub-facing) | Undecided — would need its own GitHub App if pursued | Would need `pull-requests: write` at minimum | Comment-only, proposed | Yes | Would need a new secret (App private key) | Medium — new scope, not yet justified |

Every row defaults to the same posture already established in
`docs/AGENT_TOOL_LANES.md`'s Tool Use Contract: **a tool/bot being installed
is never authorization by itself** — this matrix is the authorization: a
future addition or scope change to any of these rows is a change to this
table, not a silent capability grant.

## Governance Prerequisites

Before any bot above moves past Phase 1 (read-only) to Phase 2 (PR-opening)
or Phase 3 (write-back), the following must be true — none of these are
verifiable from repo files alone (flagged again in Open Questions), so treat
them as a checklist to confirm in the GitHub UI, not an assumption:

- **Branch protection / ruleset on `main`** — required status checks
  (`ci.yml`'s `build` job at minimum), required PR review before merge, and
  no force-push/direct-push allowance for anyone but confirmed admins.
- **Required checks include CI** — `ci.yml` must be a required check, not
  advisory-only, before any bot-opened PR can be trusted to gate on it.
- **No bot gets a broad, long-lived PAT.** Every row in the Permission Matrix
  above should authenticate as a GitHub App with a scoped installation, or
  use the platform-native mechanism (Dependabot's own credential, Actions'
  default `GITHUB_TOKEN`) — never a personal access token pasted into a repo
  secret, per this repo's existing "no ad hoc broad PATs" posture (matches
  `docs/AGENT_TOOL_LANES.md`'s least-privilege default for every other tool).
- **Actions default permissions should be minimal.** Repo/org setting for
  "Workflow permissions" should default new workflows to read-only unless a
  job explicitly declares a narrower `permissions:` block — confirm this is
  set (can't tell from the three existing workflow files, since none
  declares `permissions:` explicitly and so all three inherit whatever the
  org default is).
- **Secrets stay environment-scoped, not repo-global**, for anything
  deploy-adjacent — `deploy-vercel.yml` and `supabase-migrate.yml` already
  gate on production secrets; any new bot that touches deploy/migration
  paths should reuse that same environment boundary, not a new global
  secret.
- **CODEOWNERS should exist before any bot is allowed to auto-approve or
  auto-merge anything** (none of the bots above are recommended to do this
  in Phase 0–2, but it's a hard prerequisite if Phase 3 is ever considered
  for release/deploy automation).
- **Signed commits** — not currently required anywhere in visible config;
  not a blocker for the Phase 1/2 bots recommended here (none of them commit
  as themselves), but should be revisited if Phase 3 write-back is ever
  pursued.

## Rollout Plan

- **Phase 0 — audit only (this doc).** No bot installed. Deliverable is this
  compliance plan plus the Open Questions list below, both to be reviewed by
  David before anything in Phase 1 is actioned.
- **Phase 1 — read-only bots.** repo-health bot (issue/PR read + summary
  only). Zero write scope, zero secrets beyond its own App installation
  token. Lowest-risk phase; can start as soon as David confirms the role is
  wanted — no governance prerequisite blocks it, since it can't write
  anything.
- **Phase 2 — PR-opening bots.** Dependabot (version-update and
  security-update PRs) and, if wanted, the docs/governance bot in
  comment-or-PR mode. Requires the branch-protection and required-checks
  prerequisites above to be confirmed first, so an auto-opened PR can't
  merge without passing CI and a human review.
- **Phase 3 — limited write-back bots.** Not recommended for any bot in this
  plan yet. Would apply to a future release/deploy bot or a GitHub-facing
  Chief extension, and requires CODEOWNERS, signed-commit policy (if
  adopted), and a specific, named justification — not a default outcome of
  "the repo has matured."

## Safe Defaults

- **Least privilege by default** — every bot starts at the narrowest scope
  in the Permission Matrix; scope increases are a docs change to this file,
  not a silent App-permission edit in GitHub's UI.
- **PR-based changes only** — no bot recommended here pushes directly to any
  branch; Dependabot opens PRs, everything else is comment/summary-only.
- **Human approval gates** — matches the existing Chief/`ApprovalCard`
  pattern for coding-session agents: a bot's output is a signal for David to
  act on, never an autonomous merge/deploy/message.
- **Secret storage** — GitHub App installation tokens (short-lived,
  GitHub-managed) preferred over any PAT; where a secret is unavoidable
  (e.g. a future Chief-GitHub bridge), it goes in repo/environment secrets
  exactly like `VERCEL_TOKEN`/`SUPABASE_ACCESS_TOKEN` today — never
  hardcoded, never in `.env.example` beyond a placeholder.
- **Audit logging** — every bot's actions should be visible in the normal
  GitHub PR/Actions/audit-log surface; no bot should have a side channel
  (e.g. direct DB or API write) that bypasses GitHub's own audit trail.

## Open Questions

Settings and facts that cannot be confirmed from repo evidence alone — check
in GitHub UI/admin settings before treating any of them as decided:

1. **Is `.coderabbit.yaml` actually configured at the GitHub App / org level**
   with no local file needed, or is the CodeRabbit integration referenced in
   five docs but not actually installed? This is the single biggest
   discrepancy this audit found — worth resolving before writing any more
   docs that assume CodeRabbit is live.
2. **What is this repo's actual branch protection / ruleset configuration
   on `main`?** Not visible from any checked-in file — confirm required
   reviewers, required status checks, and force-push/delete restrictions
   directly in Settings → Branches.
3. **What is the org/repo default "Workflow permissions" setting** (read-only
   vs. read/write) for Actions? None of the three existing workflows
   declares an explicit `permissions:` block, so they inherit whichever
   default is set — worth confirming it's read-only-by-default.
4. **Is the Vercel GitHub App integration installed separately** from the
   manual `vercel deploy --token` flow in `deploy-vercel.yml`? If so, it may
   already be commenting preview URLs on PRs today — a live bot-like actor
   this audit wouldn't see from workflow files alone.
5. **Who are the current repo admins/collaborators**, and is 2FA enforced
   org-wide? Directly relevant to "service account" governance
   (`docs/AGENT_RUNBOOK.md:1155`'s HUMAN-ONLY classification for
   collaborator/branch-protection changes assumes a small, known admin set —
   confirm it hasn't drifted).
6. **Does GitHub Advanced Security / secret scanning already run** on this
   repo (available free for public repos, paid for private)? Not visible
   from workflow files since it's a platform feature, not a workflow step.

## Purpose (compliance checklist)

The sections above are the one-time audit and rollout plan. Everything below
is the standing artifact this file also serves as going forward: the
required checklist for any agent/bot or workflow that performs non-trivial
automation in this repo. Any new bot, or any change to an existing one's
triggers/permissions/secrets, updates the **Current bots/workflows** section
below with a filled-in copy of the template — this file, not tribal
knowledge, is the record of what's authorized to run and with what scope.

## Compliance checklist template

Copy this block for any new bot, workflow, or automation before it's allowed
to run against this repo:

- **Name:**
- **Workflow / config file:**
- **Triggers (events, branches):**
- **GITHUB_TOKEN permissions:**
- **Secrets used:**
- **Data plane impact (deploy, DB, etc.):**
- **Lane (READ-ONLY / PROPOSE-ONLY / EXECUTE-WITH-APPROVAL):**
- **Approval / ownership (role, e.g., Chief / Security):**

## Current bots/workflows

### CodeRabbit (review bot)

- **Name:** CodeRabbit
- **Workflow / config file:** `.coderabbit.yaml` — referenced in
  `CONTRIBUTING.md` and `docs/agents/CHIEF_OPERATING_SYSTEM.md` as a live PR
  review gate, but the config file itself is not present in this repo
  checkout (see Open Question 1 above) — treat its exact scope as
  unconfirmed until that's resolved.
- **Triggers:** GitHub App webhook on PR open/update — not a workflow file,
  not GITHUB_TOKEN-based.
- **GITHUB_TOKEN permissions:** N/A — authenticates as its own GitHub App
  installation, not via this repo's `GITHUB_TOKEN`.
- **Secrets used:** None in-repo; App-managed.
- **Data plane impact:** None — PR comments only, no code/DB/deploy writes.
- **Lane:** READ-ONLY / PROPOSE-ONLY
- **Approval / ownership:** Part of the normal PR/CodeRabbit/Chief path per
  `docs/agents/CHIEF_OPERATING_SYSTEM.md` § 4; no separate approval needed
  beyond the GitHub App install itself.

### Supabase migration PR check

- **Name:** Supabase migration PR check
- **Workflow / config file:**
  `.github/workflows/supabase-migration-pr-check.yml`
- **Triggers:** `pull_request` (opened, synchronize, reopened), paths
  `supabase/migrations/**` and `supabase/combined_migration.sql`.
- **GITHUB_TOKEN permissions:** `contents: read` at both workflow and job
  level — no GitHub write scope; this workflow never talks to the GitHub
  API beyond checkout.
- **Secrets used:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DEV_DB_URL` — scoped
  to a non-production schema only.
- **Data plane impact:** Read-only — lints/diffs migrations against a
  non-prod schema; never runs `supabase db push`.
- **Lane:** READ-ONLY
- **Approval / ownership:** Build agent maintains the workflow; candidate to
  become a required status check once branch protection is confirmed (Open
  Question 2 above) — not yet enforced as a merge gate.

### Supabase migrate workflow

- **Name:** Supabase migrate workflow
- **Workflow / config file:** `.github/workflows/supabase-migrate.yml`
- **Triggers:** push to `main` (paths `supabase/migrations/**`,
  `supabase/combined_migration.sql`), plus manual `workflow_dispatch`.
- **GITHUB_TOKEN permissions:** `contents: read` at workflow level — no job
  calls the GitHub API; this is a Supabase-only (data plane) workflow.
- **Secrets used:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` — guarded
  by a secrets-presence check that no-ops (with a warning) if either is
  unset, rather than failing hard.
- **Data plane impact:** Writes to the production Supabase schema via
  `supabase db push` — the highest-impact automation in this repo.
- **Lane:** EXECUTE-WITH-APPROVAL — gated by merge-to-`main` (human-reviewed
  PR) or a manually triggered `workflow_dispatch`.
- **Approval / ownership:** Build agent implements the migration; merge to
  `main` is the approval gate; manual `workflow_dispatch` runs are
  David/Chief's call.

### Vercel deploy workflow

- **Name:** Vercel deploy workflow
- **Workflow / config file:** `.github/workflows/deploy-vercel.yml`
- **Triggers:** push to `main`, plus manual `workflow_dispatch`.
- **GITHUB_TOKEN permissions:** `contents: read` at workflow level; the
  `deploy` job additionally scopes itself with `environment: production`
  rather than holding production secrets at the workflow level.
- **Secrets used:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_WEBHOOK_SECRET`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — guarded by a
  secrets-presence check that no-ops if `VERCEL_TOKEN` is unset.
- **Data plane impact:** Deploys the production app to Vercel — no GitHub
  writes, no direct DB writes (Supabase access here is read/runtime only,
  via the deployed app itself).
- **Lane:** EXECUTE-WITH-APPROVAL — gated by merge-to-`main` or a manually
  triggered `workflow_dispatch`.
- **Approval / ownership:** Build agent implements; merge to `main` is the
  approval gate; production secrets are scoped to the `production`
  environment, not the repo/workflow default.
