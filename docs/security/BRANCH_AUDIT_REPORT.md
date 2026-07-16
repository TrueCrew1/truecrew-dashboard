# Remote Branch Audit — Pre-Public Launch

**Date:** 2026-07-16. **Scope:** all 84 remote branches on `origin` (fetched fresh
this session via `git fetch origin '+refs/heads/*:refs/remotes/origin/*'`), cross-
referenced against all 44 currently **open** pull requests. This is a hygiene/
tidiness audit, not a security finding — no branch listed here was flagged by the
secrets scan in `PUBLIC_REPO_READINESS_REVIEW.md`.

**No branches were deleted, locally or remotely, in this pass.** This report is
input for a human decision, not an executed cleanup.

## Summary

| Category | Count |
|---|---|
| `main` | 1 |
| Merged into `main`, no open PR (branch ref is redundant — its commits already live in `main`'s history regardless of whether the branch itself is deleted) | 10 |
| Unmerged, **has an open PR** — do not touch | 44 |
| Unmerged, no open PR, **last activity within 48h of this audit** — do not touch without confirmation | 3 |
| Unmerged, no open PR, **older** — review-needed candidates | 27 |
| **Total remote branches** | **84** |

## Local remote-tracking refs (`git remote prune origin --dry-run`)

Ran a dry-run prune of local `refs/remotes/origin/*` references. **Result: nothing
to prune right now** — because this session freshly fetched all 84 branches from
`origin`, every local remote-tracking ref currently has a live branch behind it. This
command only finds local refs whose *remote* branch has already been deleted on
GitHub; it doesn't identify which branches are candidates for deletion (that's the
tables below). Re-run `git remote prune origin --dry-run` after any branches are
actually deleted on GitHub to clean up local refs then — nothing was pruned in this
pass since there was nothing eligible.

## Merged into `main`, no open PR — safe local-prune / deletion candidates

These branches' commits are already fully contained in `main`'s history (confirmed
via `git merge-base --is-ancestor <branch> origin/main`). Deleting the branch ref
itself — locally or on GitHub — loses no work, since the commits remain in `main`
either way. **Not deleted in this pass** per the task's constraints; listed here as
the lowest-risk candidates if/when a human wants to clean up branch clutter.

| Last commit | Branch |
|---|---|
| 2026-06-26 | `cursor/vercel-deploy-automation-ca49` |
| 2026-07-08 | `devin/1783553965-add-unit-tests` |
| 2026-07-09 | `claude/chief-observability-logging-y6vmc5` |
| 2026-07-12 | `feat/chief-v1-standup` |
| 2026-07-16 | `claude/rebase-119-onto-112` |
| 2026-07-16 | `claude/cherry-pick-101-tests` |
| 2026-07-16 | `claude/port-120-internal-key-fix` |
| 2026-07-16 | `claude/port-124-decision-tier` |
| 2026-07-16 | `claude/docs-close-89-preview-noise` |
| 2026-07-16 | `claude/port-109-maintenance-feature` |

## Unmerged, has an open PR — do not touch

44 branches, each backing a currently open pull request (PR numbers below). These
are active, tracked work items regardless of how old the branch is — several date
back to PR #1 (2026-06-26) and are still open four+ weeks later, which is itself
worth a human decision (close as superseded? still wanted? blocked on something?) —
but that decision belongs to whoever owns the PR queue, not to an automated branch
cleanup. **This repo's own convention already covers this** (`docs/AGENT_RUNBOOK.md`
§ Incidents / Scope Guardrail: don't delete branches or PRs that appear superseded
without verifying the feature was actually ported first) — the same rule this audit
follows.

| PR | Branch | Last commit |
|---|---|---|
| #1 | `cursor/true-crew-app-foundation-bcdd` | 2026-06-26 |
| #4 | `cursor/brand-logo-ca49` | 2026-06-26 |
| #5 | `cursor/executive-dashboard-ca49` | 2026-06-26 |
| #6 | `cursor/nextjs-supabase-foundation-bcdd` | 2026-06-26 |
| #7 | `cursor/operational-modules-bcdd` | 2026-06-26 |
| #8 | `cursor/nextjs14-app-bcdd` | 2026-06-26 |
| #9 | `cursor/supabase-client-setup-1d9e` | 2026-06-26 |
| #10 | `cursor/core-pages-bbf8` | 2026-06-26 |
| #11 | `cursor/supabase-email-auth-646d` | 2026-06-26 |
| #12 | `cursor/supabase-tables-migration-a7b5` | 2026-06-26 |
| #13 | `cursor/today-workspace-supabase-1d1c` | 2026-06-26 |
| #14 | `cursor/supabase-tables-migration-646d` | 2026-06-26 |
| #15 | `cursor/env-example-supabase-docs-b89b` | 2026-06-26 |
| #16 | `feat/operator-gate-actions` | 2026-06-26 |
| #17 | `cursor/gate-clear-stage-advance-1608` | 2026-06-26 |
| #20 | `cursor/rail-ready-to-advance-9e20` | 2026-06-28 |
| #21 | `cursor/inline-status-advance-8ea8` | 2026-06-28 |
| #22 | `cursor/today-shift-stats-strip-4a10` | 2026-06-28 |
| #31 | `cursor/operator-trust-feedback-ee14` | 2026-06-28 |
| #41 | `cursor/obsidian-logging-verify-f5be` | 2026-06-29 |
| #46 | `cursor/fix-api-obsidian-notes-local-dev-dffd` | 2026-06-29 |
| #47 | `cursor/vite-api-dev-plugin-d2fc` | 2026-06-29 |
| #56 | `vercel/install-vercel-speed-insights-kwl3dy` | 2026-07-03 |
| #73 | `build/stress-test-health-check-cards` | 2026-07-04 |
| #92 | `devin/1783553709-api-auth-hardening` | 2026-07-08 |
| #93 | `devin/1783553813-error-handling` | 2026-07-08 |
| #95 | `devin/1783553971-api-http-utils` | 2026-07-08 |
| #100 | `devin/1783558944-maintenance-fu3-tests` | 2026-07-09 |
| #102 | `test/librarian-runtime-edge-cases` | 2026-07-08 |
| #103 | `devin/1783560307-librarian-tests` | 2026-07-09 |
| #104 | `test/maintenance-runtime-edge-cases` | 2026-07-08 |
| #105 | `fix/maintenance-taxonomy-97-98` | 2026-07-08 |
| #107 | `feat/maintenance-ui-wiring` | 2026-07-08 |
| #108 | `devin/1783566197-maintenance-note-visibility` | 2026-07-09 |
| #113 | `claude/research-second-brain-spec-49iz7u` | 2026-07-10 |
| #115 | `feat/planner-reprioritization-signal` | 2026-07-10 |
| #116 | `feat/chief-memory-review-startup` | 2026-07-09 |
| #117 | `feat/research-finding-filing-scaffold` | 2026-07-09 |
| #118 | `build/planner-work-items-route` | 2026-07-11 |
| #121 | `claude/chief-ai-voice-v1-c7q9n5-backend` | 2026-07-15 |
| #122 | `claude/chief-ai-voice-v1-c7q9n5-frontend` | 2026-07-15 |
| #123 | `claude/chief-ai-voice-v1-c7q9n5-voice` | 2026-07-15 |
| #131 | `claude/ai-tool-operating-guide-7dkmmk` | 2026-07-16 |
| #132 | `security/pre-public-repo-readiness-review` | 2026-07-16 (this audit's own branch) |

## Unmerged, no open PR, activity within the last 48 hours — do not touch without confirmation

No open PR exists for these, but they were touched within two days of this audit —
too recent to assume abandoned. Could be in-progress work about to become a PR, or a
base branch for the `claude/chief-ai-voice-v1-c7q9n5-*` sub-branches above.

| Last commit | Branch |
|---|---|
| 2026-07-14 | `claude/chief-planner-verify-jba89n` |
| 2026-07-15 | `claude/chief-ai-voice-v1-c7q9n5` |
| 2026-07-16 | `claude/chief-operating-layer` |

## Unmerged, no open PR, older — review-needed candidates

No open PR, no recent activity (last commit more than 48 hours before this audit,
oldest from 2026-06-26). These are the most likely candidates for abandoned/
superseded work, but **this audit did not check closed-PR history** for these
branch names, so it cannot confirm whether each one was: (a) never opened as a PR,
(b) closed without merging (deliberately rejected), or (c) had its actual feature
ported to `main` through a different, later PR under a different branch name. Per
this repo's own Scope Guardrail (`docs/AGENT_RUNBOOK.md`), verify which of those
three applies — by checking closed PRs for the branch name, or comparing the
branch's diff against current `main` — before deleting anything here.

| Last commit | Branch |
|---|---|
| 2026-06-26 | `chore/p2-p3-cleanup` |
| 2026-06-26 | `feat/post-advance-next-step` |
| 2026-06-29 | `cursor/task-customer-visibility` |
| 2026-06-29 | `cursor/task-customer-visibility-gates` |
| 2026-06-29 | `cursor/empty-states-table-usability` |
| 2026-06-29 | `cursor/empty-states-table-usability-clean` |
| 2026-06-30 | `cursor/gate-warning-modal` |
| 2026-06-30 | `cursor/gate-warning-modal-clean` |
| 2026-06-30 | `cursor/stage-change-trust-feedback` |
| 2026-06-30 | `v0/replace-logo-3d5db1c9` |
| 2026-06-30 | `chief-approvals-alerts` |
| 2026-07-01 | `feat/dashboard-empty-states-hardening` |
| 2026-07-03 | `docs/internal-api-auth-runbook` |
| 2026-07-05 | `docs/audit-july-2026` |
| 2026-07-05 | `docs/zed-decommission` |
| 2026-07-05 | `feature/chief-board-glance-and-urgency` |
| 2026-07-08 | `today-status-union-and-exhaustive-adapter` |
| 2026-07-08 | `test/librarian-unit-tests` |
| 2026-07-09 | `devin/1783557935-maintenance-slice` |
| 2026-07-09 | `docs/lesson-second-brain-maintenance-rot` |
| 2026-07-09 | `devin/1783571845-chief-log-agent-packets` |
| 2026-07-09 | `docs/agent-lanes-maintenance-rot-on-main` |
| 2026-07-10 | `docs/agent-lanes-maintenance-rot-main` |
| 2026-07-10 | `feat/content-live-signal` |
| 2026-07-10 | `docs/agent-ecosystem-operational-readiness` |
| 2026-07-10 | `feat/maintenance-librarian-governance-slice` |
| 2026-07-12 | `wip/pre-cleanup-safety-snapshot-2026-07-11` |

Note: `wip/pre-cleanup-safety-snapshot-2026-07-11` is the branch that held the one
placeholder-only gitleaks match noted in `PUBLIC_REPO_READINESS_REVIEW.md`
(`docs/OBSERVABILITY.md`'s `YOUR_INTERNAL_API_SECRET` curl example) — not a security
reason to keep or remove it, just noting the cross-reference.

## What this audit is *not* saying

- This is **not** a security issue. A public repo with many open PRs and stale
  branches is a tidiness/hygiene signal, not a secrets or access-control risk.
- This audit does **not** recommend deleting anything in this pass. Every table
  above is for a human decision — see `docs/security/PUBLIC_LAUNCH_CHECKLIST.md`
  for how this fits into the broader pre-launch checklist.
