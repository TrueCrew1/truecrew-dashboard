---
title: Agent Lane Reconciliation Plan
status: draft
owner: TrueCrew
created: 2026-07-12
tags: [operations, agents, lanes, reconciliation]
---

# Agent Lane Reconciliation Plan

## Purpose

This plan reconciles the existing legacy lane model (Chief / Research / Filing, built
around the `knowledge/` second brain) with the newly introduced Chief / Build / Filing
shelf-based roles (`docs/SECOND_BRAIN`, `docs/OPERATIONS`, `docs/AGENT_CONTRACTS`). It
is a **planning artifact only** — it does not resolve any of the open conflicts in
concrete implementation terms. Implementation is deferred to Build, and only after
Chief approves specific follow-up items from this plan.

## Current lane models

1. **Legacy lanes** — [docs/AGENT_LANES_INTERNAL.md](../AGENT_LANES_INTERNAL.md) defines
   Chief / Research / Filing. Chief routes approvals and reads `AGENT_RUNBOOK.md` plus
   repo docs (never `knowledge/` directly). Research runs an iterative
   question-framing → source-discovery → filing loop and hands off findings via
   [docs/OBSIDIAN_RESEARCH_INTAKE.md](../OBSIDIAN_RESEARCH_INTAKE.md). Filing writes to
   `knowledge/log.md`, `knowledge/lessons/*.md`, `knowledge/inbox/*.md`, and — local
   sessions only — the live Obsidian vault via `npm run obsidian:log`. This model is
   detailed, cross-referenced against `AGENT_RUNBOOK.md`, and already has a working tier
   system (Log / Lesson / Starter-Pass-candidate) described in
   [docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md](../RESEARCH_SECOND_BRAIN_WORKFLOW.md).

2. **New lanes** — [AGENTS.md](../../AGENTS.md) and [docs/agents/*.md](../agents/Chief.md)
   define Chief / Build / Filing for the `docs/SECOND_BRAIN` shelf. Chief approves/vetoes
   Filing and Build proposals; Build makes small (<30 line) doc/shelf edits per
   [docs/AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md](../AGENT_CONTRACTS/SECOND_BRAIN_BUILD_AGENT_CONTRACT.md);
   Filing mirrors approved docs into vault paths per
   [docs/AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md](../AGENT_CONTRACTS/OBSIDIAN_FILING_AGENT_CONTRACT.md).
   All shelf docs are `status: draft` and self-flag two ambiguities against the legacy
   model in [docs/SECOND_BRAIN/SECOND_BRAIN_INDEX.md](../SECOND_BRAIN/SECOND_BRAIN_INDEX.md)
   and [docs/OPERATIONS/changelog.md](changelog.md).

## Proposed role map

A provisional working split for now — not a final decision:

- **Chief** — owns approvals, audits, precedence decisions, and unresolved conflicts.
  Nothing in this plan changes Chief's existing approval-router role from either model.
- **Planner / Research** — owns investigation, repo/vault analysis, intake, reconciliation
  proposals, and backlog shaping. This is the legacy Research lane's role, carried
  forward under the "Planner / Research" name `AGENTS.md` already uses for it.
- **Build** — owns small, approved repo doc/shelf changes and structural maintenance
  only, per its existing contract.
- **Filing** — owns approved vault mirroring, redirects, and filing logs, per its
  existing contract.

Explicitly:
- Build does not replace Research/Planner. Build's own lane doc already says this
  ([docs/agents/Build.md](../agents/Build.md) § Lane-splitting TODO).
- Research/Planner does not directly perform broad structural rewrites unless
  explicitly approved by Chief.
- Filing does not define repo policy — it mirrors what Chief/Build have already
  approved.

Note: a Kimi-based (or similar free-tool) drafting aid is not a new lane in this role
map. Per `docs/AGENT_RUNBOOK.md`'s Tool Catalog (PROPOSE-ONLY, no repo access), any such
tool's output is raw material for Planner/Research or Content, routed through their
existing approval paths — not a standalone execution or precedence-setting role.

## Precedence rule (provisional)

- **Existing legacy docs remain authoritative** for research/intake behavior
  (`docs/AGENT_LANES_INTERNAL.md`, `docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md`,
  `docs/OBSIDIAN_RESEARCH_INTAKE.md`, `knowledge/` conventions) until Chief explicitly
  migrates or supersedes them.
- **New `AGENTS.md` + `docs/agents/*.md`** are authoritative for shelf-oriented
  Build/Filing execution introduced in July 2026 (`docs/SECOND_BRAIN`,
  `docs/OPERATIONS`, `docs/AGENT_CONTRACTS`).
- **Where overlap exists, conflicts must be elevated to Chief and tracked** — worker
  agents (Build, Filing, Research) do not silently resolve them by picking one model
  over the other.

This rule is temporary and operating-only. It does not declare a winner between the
two second-brain concepts, the two vault-path conventions, or the two logging
mechanisms — see Open conflicts below.

## Open conflicts

### 1. Second-brain structure conflict
- **What**: Legacy `knowledge/`-rooted second brain (referenced throughout
  `RESEARCH_SECOND_BRAIN_WORKFLOW.md` and `OBSIDIAN_RESEARCH_INTAKE.md`, but the
  `knowledge/` directory does not currently exist in this working tree) vs. the new
  `docs/SECOND_BRAIN` shelf concept and its `vault/Operations/*`-style mirror targets.
- **Why it matters**: Two different in-repo "second brain" concepts with different
  destinations, tiers, and write permissions risk agents filing the same finding to two
  places, or to the wrong one, without either lane noticing.
- **What Chief must eventually decide**: whether `docs/SECOND_BRAIN` is a distinct
  concept from `knowledge/` (e.g. repo/agent-governance docs vs. research findings), a
  successor to it, or a layer that should be merged with it.
- **What worker agents must avoid until then**: creating a `knowledge/` directory to
  "complete" the legacy model, or treating `docs/SECOND_BRAIN` as a drop-in replacement
  for `knowledge/` filing destinations named in `OBSIDIAN_RESEARCH_INTAKE.md`.

### 2. Logging conflict
- **What**: `npm run obsidian:log` writes to the live Obsidian vault (Build Log, PR Log,
  Decisions — local-session-only, per `docs/OBSIDIAN_LOGGING.md`) vs.
  `docs/OPERATIONS/changelog.md`, a repo-tracked operations log for shelf changes.
- **Why it matters**: Both are already in active use (the changelog has real entries;
  `obsidian:log` is a working CLI). Without a defined relationship, agents may log the
  same change twice, in inconsistent formats, or skip one destination entirely,
  breaking either the vault's record or the repo's audit trail.
- **What Chief must eventually decide**: whether `docs/OPERATIONS/changelog.md` is a
  mirror of vault logs, a summary of high-level shelf changes only, or a genuinely
  separate log — and, if separate, what keeps the two consistent over time.
- **What worker agents must avoid until then**: treating either log as authoritative
  over the other, or skipping the changelog entry because a vault log entry was (or
  will be) written, or vice versa.

### 3. Lane-definition conflict
- **What**: `docs/AGENT_LANES_INTERNAL.md` (Chief / Research / Filing) vs.
  `AGENTS.md` / `docs/agents/*.md` (Chief / Build / Filing).
- **Why it matters**: The two docs use different names for adjacent roles (Research vs.
  Planner/Research vs. Build) and different scopes (legacy lanes govern `knowledge/`
  and live-vault filing; new lanes govern the `docs/SECOND_BRAIN` shelf only). An agent
  reading only one doc could misjudge its own boundaries.
- **What Chief must eventually decide**: whether the two lane sets are parallel
  (different scopes, coexist indefinitely), whether one supersedes the other, or
  whether they should be merged into one lane doc.
- **What worker agents must avoid until then**: rewriting `AGENT_LANES_INTERNAL.md` to
  match the new lanes, or rewriting `AGENTS.md`/`docs/agents/*.md` to match the legacy
  lanes — either would silently pick a winner.

## Approved Build follow-ups

Specific, Build-safe follow-up tasks that can happen **after** this plan is reviewed —
each small, additive, non-policy-making, and within Build's existing contract:

1. Add a short "operating under provisional precedence rules" note (with a link to this
   plan) to [docs/agents/Build.md](../agents/Build.md) and
   [docs/agents/Filing.md](../agents/Filing.md).
2. Add cross-links between [docs/AGENT_LANES_INTERNAL.md](../AGENT_LANES_INTERNAL.md)
   and the new lane docs (`AGENTS.md`, `docs/agents/*.md`), without declaring either one
   superseded.
3. Add a short note in [AGENTS.md](../../AGENTS.md) clarifying that Planner/Research
   remains a separate planning lane until formal migration (mirrors the existing
   "future roles, not fully defined here yet" line, made more explicit).
4. Add one operations note (in `docs/OPERATIONS/`) documenting where reconciliation
   plans live, so a future Chief/Planner pass has a fixed place to look.
5. Update [docs/agents/Build.md](../agents/Build.md) § Lane-splitting TODO to reference
   this plan by filename, so the TODO points at a concrete artifact instead of "future
   session."

## Not in scope for Build

Build must not do any of the following without explicit Chief approval:

- Deciding which lane model (legacy vs. new) wins.
- Renaming or moving `docs/AGENT_LANES_INTERNAL.md`, `knowledge/`, or any other legacy
  doc/directory.
- Changing vault-path conventions (`OBSIDIAN_VAULT_PATH`-relative vs. `vault/`-prefixed)
  in any doc or in `lib/obsidian/paths.ts`.
- Changing logging semantics (what `npm run obsidian:log` writes, or what
  `docs/OPERATIONS/changelog.md` is defined to be).
- Deleting or archiving any file as part of "cleanup."

## Exit criteria

Before a future implementation pass can be considered complete:

- Role docs (`AGENT_LANES_INTERNAL.md`, `AGENTS.md`, `docs/agents/*.md`) are
  cross-linked to each other and to this plan.
- The provisional precedence rule is documented somewhere all worker agents will
  actually read before their first edit.
- No broken links introduced by any follow-up change.
- `docs/OPERATIONS/changelog.md` has an entry for every follow-up applied.
- All three open conflicts above remain explicitly tracked (in this doc or a successor)
  until Chief resolves them — none silently disappear because a doc was edited around
  them.
