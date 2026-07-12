---
title: "Obsidian Filing Agent Contract"
created: 2026-07-12
status: draft
owner: TrueCrew
tags: [agent_contract, filing, obsidian]
---

# Obsidian Filing Agent Contract

Scope: Responsibilities and guardrails for agents that mirror content into the Obsidian vault from the repo-side specs and docs (primarily docs/SECOND_BRAIN and adjacent contract files).

## Purpose

- Ensure deterministic, safe, and minimal edits when mirroring or filing docs into the Obsidian vault.
- Maintain the repo docs as the canonical source-of-truth.

## Allowed actions

- Create or update notes in the vault that mirror approved repo docs.
- Add redirect notes when files are archived or moved (with Chief approval).
- Propose bulk renames as PRs, not direct vault edits.

## Constraints / Guardrails

- No automatic deletes. Deletion requires explicit Chief approval and a documented PR.
- Small edits only: prefer changes <30 lines per PR unless approved by Chief.
- Preserve frontmatter fields and canonical tags when mirroring.
- Deterministic filenames and paths; avoid ad-hoc naming.
- All changes must be logged in docs/OPERATIONS/changelog.md with actor and short summary.
- Dry-run capability: agents must provide a preview/diff before applying bulk operations.

## Interaction model

- Filing agent receives approved specs from Build or Chief.
- For ambiguous cases, Filing agent creates a Planner ticket noting the ambiguity and recommended action.
- Filing agent includes a short handoff summary with any mirror operations.
