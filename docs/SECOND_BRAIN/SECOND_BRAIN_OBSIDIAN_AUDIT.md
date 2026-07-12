---
title: "Second Brain — Obsidian Vault Audit Spec"
created: 2026-07-12
status: draft
owner: TrueCrew
tags: [second_brain, audit, workflow, obsidian]
---

# Second Brain — Obsidian Vault Audit Spec

This document specifies the on-demand audit process for the Obsidian vault that holds the "second brain" notes and mirrored repo docs. It is a source-of-truth checklist for audits and acceptance criteria. This spec intentionally describes on-demand checks rather than a fixed cadence.

## 1. Purpose

- Verify structural consistency between the repo docs and the Obsidian vault.
- Identify missing metadata, broken links, and tag inconsistencies.
- Produce an actionable findings list that can be handed to Planner/Build/Filing roles.

## 2. Scope

- Files mirrored from docs/SECOND_BRAIN and core docs intended to live in the vault.
- Link graph health for notes that are part of the second brain.
- Tag and frontmatter hygiene for second brain folders.

## 3. Snapshot & Baseline

- Export a vault snapshot: export file counts, top-level folders, and last-modified timestamps.
- Record baseline metrics:
  - Total notes in second brain area
  - Number of notes without frontmatter
  - Number of broken links (internal)
  - Number of TODOs/unfinished fragments

## 4. Consistency Checks

- Frontmatter: each note intended as canonical must include title, created, status, owner, tags.
- Tags: enforce tag namespace rules (e.g., second_brain, shelf, agent_role).
- Filenames: enforce deterministic, human-readable filenames; prefer kebab-case.
- Link graph: run link-check across the vault and list 404s or orphaned notes.
- Redirects & archives: confirm archived notes are in an /archive folder and redirect notes exist where relevant.

## 5. Coverage & Gaps

- Map notes to roles and responsibilities: ensure each role has at least one operational doc.
- Flag duplicate or overlapping notes for Planner/Chief review.
- Identify "empty shelves" (folders with fewer than N actionable notes) and recommend action.

## 6. On-demand audit checklist

- Produce a concise checklist run when an audit is requested:
  - Export vault snapshot (counts, timestamps).
  - Run frontmatter pass for required fields.
  - Run tag/namespace pass and normalize obvious tag typos.
  - Run link-graph check and list broken links.
  - Produce findings summary with severity and suggested next-step (Planner task, Filing PR, Build patch).
  - Add audit summary entry to docs/OPERATIONS/changelog.md.

## 7. Acceptance Criteria

- No high-severity broken links remaining in second-brain area.
- Frontmatter fields present for canonical notes.
- Audit findings are triaged into Planner backlog with clear owners.

## 8. Notes / Future mirroring

- This document is the canonical repo-side audit spec. The Filing agent contract describes mirroring practices to the Obsidian vault.
- TODO: document exact link-check tooling and command-line examples.
