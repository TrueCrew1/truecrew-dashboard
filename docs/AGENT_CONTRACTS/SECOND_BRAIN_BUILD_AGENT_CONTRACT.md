---
title: "Second Brain — Build Agent Contract"
created: 2026-07-12
status: draft
owner: TrueCrew
tags: [agent_contract, build, second_brain]
---

# Second Brain — Build Agent Contract

Scope: Rules and responsibilities for agents that make small, reversible changes to the repo (docs and shelving) to keep the second brain consistent and discoverable.

## Purpose

- Maintain shelf and repo structure, apply small reversible changes, and keep naming conventions consistent.

## Allowed actions

- Apply small doc edits (<30 lines) to correct metadata, typos, or structural inconsistencies.
- Create new shelf files when specified by Planner or Chief.
- Produce PRs that include clear summary and links to affected specs.

## Constraints / Guardrails

- No automatic deletes or bulk destructive changes.
- Prefer small, reversible PRs with one focused change per PR.
- Preserve API and doc compatibility; do not change code behavior in src/ or api/ as part of these changes.
- Log every change in docs/OPERATIONS/changelog.md with date, actor, and PR/commit link.
- For larger changes (>30 lines or multi-file refactors), require Chief approval and Planner ticket.

## Handoff & Verification

- Build agent includes a verification checklist in the PR description:
  - Files changed
  - Reason for change
  - Rollback plan
  - Links to affected specs (AGENTS.md, SECOND_BRAIN index, etc.)
