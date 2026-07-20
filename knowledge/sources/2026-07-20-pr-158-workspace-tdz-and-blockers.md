---
id: finding-2026-07-20-pr-158-workspace-blockers
title: PR #158 workspace triage — TDZ fixed; path hardening still BLOCKED; isolated from Chief stack
type: finding
status: active
truth_level: observed
scope: ops-workflow
sensitivity: internal
regs: []
data_type: desk_research
created_by: research
created_at: 2026-07-20
updated_at: 2026-07-20
links:
  - docs/V1_TRUTH_MAP.md
  - https://github.com/TrueCrew1/truecrew-dashboard/pull/158
  - https://github.com/TrueCrew1/truecrew-dashboard/pull/156
  - https://github.com/TrueCrew1/truecrew-dashboard/pull/157
tags: [pr-158, workspace, truth-map, chief-stack]
evidence_strength: high
---

# PR #158 workspace triage — TDZ fixed; path hardening still BLOCKED; isolated from Chief stack

> File under `knowledge/sources/`. Schema: `knowledge/reference/knowledge-schema.md`. Not policy until validated/promoted.

## Context

Operational risk note for open PR #158 (`cursor/research-cleanup-workflow-075e`) relative to the Chief confidence / Builder mission stack (#156 / #157).

## Finding

1. **TDZ bug fixed:** `WORKSPACE_PREVIEW` temporal-dead-zone in `scripts/setup-truecrew-workspace.ts` was fixed on the PR tip (`6c666c7`). Owner verification reported tests/build/setup dry-run passing.
2. **Still BLOCKED as REAL ship:** [V1 Truth Map](../../docs/V1_TRUTH_MAP.md) File/Second Brain row keeps Drive workspace triage **BLOCKED** for hardcoded founder-machine path defaults and missing Drive-mount validation — not because of the TDZ.
3. **Isolated from #156/#157:** #158 is a separate branch and does **not** sit under the Chief confidence (#156) → Builder mission (#157) stack. It is **not** a merge blocker for those PRs.
4. **PR hygiene:** #158 remains draft and CONFLICTING with `main` as of this note — rebase/conflict cleanup is separate from Chief-stack merge order.

## Evidence

- Truth Map: Drive-only workspace triage status BLOCKED + Phase 1 action (path/env hardening).
- GitHub PR #158 review comment documenting TDZ fix + MERGE AFTER FIX recommendation under System Law (path gaps still apply for REAL).
- PR #157 body: stacked on confidence-policy commits from #156’s branch — unrelated to workspace triage files.

## Implications for TrueCrew

Treat #158 as an isolated workspace capability with remaining Truth Map BLOCKED gaps. Do not hold #156/#157 on #158. Do not claim workspace triage REAL until path validation lands and the Truth Map row is updated via a docs PR.

## Open questions

- When path/mount preflight is added, who updates the Truth Map row to REAL/PARTIAL?
