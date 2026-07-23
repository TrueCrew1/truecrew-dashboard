# Branch cleanup plan — truecrew-dashboard

**Audit date:** 2026-07-22  
**Policy:** plan only — humans delete/archive; agents do not.

## Snapshot

| Metric | Count |
|--------|------:|
| Remote branches (excl. HEAD) | ~67 |
| Open PRs | **~52** |
| Branches with no open PR | ~14 |
| Tips older than 45 days | **0** |

Debt is mostly **open PR volume**, not abandoned tips. Confirm `main` protection in GitHub Settings (this audit could not read protection rules).

## Legend

- **KEEP** — leave alone  
- **MERGE** — review and merge, or close as superseded  
- **ARCHIVE** — tag/rename before delete (`backup/*`, `wip/*`)  
- **DELETE** — only after merge/abandon + human OK  

## Priority actions

1. Confirm `main` protection (CI: lint + test + build).
2. Close or merge duplicate open PRs (Chief / LLM / docs clusters).
3. **DELETE** (safe first): `claude/chief-ms-painting-context-isz4ub` (merged #186).
4. **ARCHIVE** then delete: `wip/pre-cleanup-safety-snapshot-2026-07-11`, `backup/copilot-v1-integration-checks-tracked-2026-07-20`.
5. Review remaining no-PR branches (`docs/*`, `chore/*`, old feat/test heads) with `git log main..origin/<branch>` before delete.
6. Weekly: drive open PR count toward ~10.

## MERGE or close (examples)

| Item | Note | Risk |
|------|------|------|
| Overlapping Chief PRs (#121–123, #183–185, #187) | Pick one lane; close rest | Medium |
| LLM router PRs (#143, #150, #152) | Close if already on `main` | Medium |
| Devin auth/http PRs (#92, #93, #95) | Diff against current `lib/auth.ts` / `lib/http.ts` | High if blind-merged |

## ARCHIVE candidates (no open PR)

`docs/agent-lanes-maintenance-rot-*`, `docs/internal-api-auth-runbook`, `chore/github-templates`, `chore/p2-p3-cleanup`, `copilot/fix-vercel-preview-deployment-failure`, `claude/chief-planner-verify-jba89n`, `cursor/chief-daily-turnover-slack-0eaa`, `cursor/v1-tip-refresh-doc-31b2`, `feat/content-live-signal`, `today-status-union-and-exhaustive-adapter`, plus `backup/*` / `wip/*` above.

## Older open PRs (~14d+)

#1, #12–14 (foundation/migrations), #16, #22, #47, #56, #73, #92–95, #102–108 — prefer close-as-obsolete or explicit rebase decision.

## Do not

- Mass-delete from a script  
- Delete any branch with an open PR  
- Touch open PRs as part of the hygiene baseline commit  
