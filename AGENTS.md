# AGENTS.md — repo-local agent operating note

For any external build agent working in this repo. This file doesn't restate the full
process — it points to it and adds the operating discipline that isn't written down
elsewhere. Read the linked docs before your first edit.

## Purpose

Tell a build agent how to behave *correctly* in this specific repo — inspect before
editing, work in one approved slice at a time, cite real evidence, and stop at the
repo's existing boundaries instead of guessing past them.

## Repo context

True Crew — a SaaS command center for operations/maintenance supervisors. Stack:
Vercel (SPA + serverless `/api`), Supabase Postgres, GitHub webhooks (PR/CI gates),
Obsidian (knowledge/logging). Full stack table: [README.md](README.md). Product tone,
coding preferences, and what to avoid: [CLAUDE.md](CLAUDE.md) — read it first, it's
auto-loaded for Claude Code sessions but not for other agents, so read it explicitly.

## Operating lanes

This repo defines named lanes for different kinds of agent work — Scout (read-only
inspection), Build (bounded changes against a written spec), Architecture/spec
(turns asks into bounded specs for Build). Full definitions, what each lane must not
do, and copy-paste kickoff prompts: [docs/EXECUTION_KIT.md](docs/EXECUTION_KIT.md) §3–4.
If you were not given a lane, assume Build and ask for a spec if one wasn't provided.

## Second-brain shelf roles

Three roles for the `docs/SECOND_BRAIN` / `docs/OPERATIONS` / `docs/AGENT_CONTRACTS`
shelf (draft status — see the open conflicts in
[docs/agents/Chief.md](docs/agents/Chief.md) before treating this as settled):

- **Chief** — governs audits and agent behavior; approves/vetoes Filing and Build
  proposals. [docs/agents/Chief.md](docs/agents/Chief.md)
- **Build** — maintains shelf structure, applies small safe changes (<30 lines).
  [docs/agents/Build.md](docs/agents/Build.md)
- **Filing** — mirrors approved specs into the Obsidian vault safely.
  [docs/agents/Filing.md](docs/agents/Filing.md)
- **Planner / Research** — future roles, not fully defined here yet.

Note: free/manual overflow-chat tools (Kimi, DeepSeek, free ChatGPT, etc.) are not a
lane here — per [docs/AGENT_RUNBOOK.md](docs/AGENT_RUNBOOK.md)'s Tool Catalog they're
PROPOSE-ONLY, no-repo-access drafting aids whose output (if used) routes through the
Research/Content track like any other agent output; see
[docs/EXECUTION_KIT.md](docs/EXECUTION_KIT.md)'s Draft/QA text row.

Shelf specs and contracts these roles operate against:
- Obsidian vault audit spec → [docs/SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md](docs/SECOND_BRAIN/SECOND_BRAIN_OBSIDIAN_AUDIT.md)
- Repo audit spec → [docs/OPERATIONS/REPO_AUDIT_SPEC.md](docs/OPERATIONS/REPO_AUDIT_SPEC.md)
- Obsidian Filing Agent contract → [docs/AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md](docs/AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md)
- Second Brain Build Agent contract → [docs/AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md](docs/AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md)
- Operations changelog → [docs/OPERATIONS/changelog.md](docs/OPERATIONS/changelog.md)

Shelf guardrails (in addition to the non-negotiable rules below):
- Chief is the top-level lane for this shelf — Build and Filing obey Chief's
  guardrails and approvals.
- No automatic deletes.
- Prefer small edits (<30 lines) unless explicitly approved for something larger.
- Log every shelf change in `docs/OPERATIONS/changelog.md` **or** the existing
  vault-side log (`npm run obsidian:log`) — the relationship between the two is not
  yet defined; see the open conflicts in
  [docs/agents/Chief.md](docs/agents/Chief.md).

## Non-negotiable rules

- **Check the working tree before editing.** Run `git status --short` first. If it's
  not clean or not what you expect, stop and explain the mismatch before touching
  anything — don't assume your starting point.
- **One slice per approval round.** Propose scope (goal, files, smallest valid change,
  risk, verification plan), wait for explicit approval, implement only that slice, then
  stop. Don't chain unapproved follow-on work into the same pass.
- **Smallest valid change.** Do only what the request asks — no drive-by refactors, no
  "while I'm in here" cleanup, no bundling unrelated fixes into one change. See
  [.claude/project-rules.md](.claude/project-rules.md).
- **Cite exact file paths and evidence.** Reference real `path:line` locations for
  claims about what exists. Don't describe files, hooks, labels, or behavior you
  haven't actually read in this repo.
- **No invented infrastructure.** Don't add new services, background jobs, schedulers,
  state-management libraries, or dependencies without a clear, stated reason tied to
  the actual request.
- **No unrelated edits.** Touch only the files the approved slice covers. If you notice
  an unrelated issue, name it separately — don't fix it inline.
- **Approval routes through Chief only, in-app.** No agent asks a human for a decision
  outside the Chief → Approvals surface. See
  [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md) and
  [docs/AGENT_CONSTITUTION.md](docs/AGENT_CONSTITUTION.md) for the full law — this file
  doesn't restate it.

## Default workflow

1. Inspect first — read the relevant files, don't assume. Use the per-task-type
   checklist in [.claude/workflow-checklists.md](.claude/workflow-checklists.md).
2. Propose the slice (goal / scope / files / smallest valid change / risk /
   verification plan) and wait for approval.
3. Implement only the approved slice.
4. Run verification (see below).
5. Report what changed, plainly — no unearned confidence about anything unverified.

## Response format

When proposing a slice, use this shape:
```
Goal / Scope / Files likely involved / Smallest valid change / Risk / Verification plan
```
When reporting completion: files changed, minimal diff summary, verification results,
manual verification notes (if applicable), and what's implemented vs. still assumed.

## Verification standards

- Code changes: `npm run lint`, `npm run test`, `npm run build` (or the project's true
  typecheck equivalent if no dedicated script exists — state that explicitly rather
  than inventing a script).
- Docs-only changes: `npm run qa` (lint + build) to confirm nothing under `src/` was
  accidentally touched — per [docs/EXECUTION_KIT.md](docs/EXECUTION_KIT.md) §8.
- PRs: use [docs/PR_SUMMARY_TEMPLATE.md](docs/PR_SUMMARY_TEMPLATE.md). Never ask the
  approver to run commands — put anything that must run outside the agent environment
  in an **Ops to run** section.

## Stop conditions

Stop and ask before proceeding when:
- The working tree isn't in the state you expected.
- The request conflicts with an existing doc, gate, or approval boundary.
- The smallest valid change is genuinely ambiguous between two real options.
- You'd need to touch `src/components/chief/agentApprovalGates.ts` or
  `ChiefApprovalsContext.tsx` and the spec didn't explicitly call for it — read
  [docs/AGENT_APPROVAL_LOOPS.md](docs/AGENT_APPROVAL_LOOPS.md) first if it does.
