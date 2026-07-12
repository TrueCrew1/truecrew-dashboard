---
title: "Repo Audit Spec"
created: 2026-07-12
status: draft
owner: TrueCrew
tags: [operations, audit, repo]
---

# Repo Audit Spec

On-demand repository audit specification for the second brain and adjacent docs. This describes the minimal checks required to validate structural and naming conventions, agent wiring, and missing-items inventories.

## 1. Purpose

- Validate the repo shape for second brain work.
- Confirm agent contracts and AGENTS.md wiring are present and accurate.
- Produce a missing-items list and a small safe-change plan.

## 2. Scope

- docs/SECOND_BRAIN, docs/AGENT_CONTRACTS, docs/agents, AGENTS.md.
- Basic scans of src/, docs/, and API surface where applicable (to verify references, not to change code).

## 3. Snapshot & Baseline

- Generate a file inventory for the targeted folders.
- Record counts for markdown docs, frontmatter completeness, and role docs present.
- Record last commit hashes touching these folders.

## 4. Checks

- Presence of required spec and contract files.
- Frontmatter completeness for role and contract files.
- AGENTS.md references are resolvable.
- No references to deprecated paths or files.
- Identify missing tests or docs referenced in the notes.

## 5. Missing-items checklist

- Missing role docs or contracts.
- Missing mirror entries in vault.
- Broken cross-links between docs and code.

## 6. On-demand repo audit checklist

- Export repo snapshot for target folders.
- Verify presence and frontmatter of required files.
- Run link and path resolution for AGENTS.md references.
- Produce a prioritized missing-items list and recommended small fixes (<30 lines each).
- Log audit summary to docs/OPERATIONS/changelog.md.

## 7. Acceptance Criteria

- All required spec and contract files present and with required frontmatter.
- AGENTS.md links resolve to files in the repo.
- Findings are filed into Planner backlog for action.
