# Branch hygiene and safe prune

**Goal:** Reduce stale-branch noise without deleting work that is not already preserved
in `main`.

**Human-only:** branch deletion. Agents audit and recommend; they do **not** auto-delete.

---

## Preserve by default

| Category | Default action |
|---|---|
| Open-PR branches | **Preserve** — backs live review work |
| Review branches (unmerged, active) | **Preserve** until inspected individually |
| Snapshot / backup branches (`wip/*`, `backup/*`) | **Tag before delete** — `git tag archive/<name> <sha>` |
| Keeper branches (substantive unmerged work) | **Preserve** until landed or explicitly retired |
| Merged or patch-equivalent in `main` | **Candidate** for delete after proof below |

---

## Prove safety before delete (per branch)

```bash
git cherry main <branch>
```

| Output | Meaning | Action |
|---|---|---|
| All lines `-` | Every commit patch already in `main` | Safe delete candidate |
| Any line `+` | Unique commits not in `main` | **Do not delete** |

Run this **per branch** — never batch-delete on assumption.

---

## Audit workflow (read-only)

```bash
# open PRs
gh pr list --state open

# local branches not on origin
git branch -vv | grep ': gone]'

# stale remote-tracking
git fetch origin --prune
git branch -r
```

Cross-check against `knowledge/MEMORY.md` and pending decisions — do not re-flag
known blockers (e.g. PR #58 rotation gate) as fresh problems.

---

## Safe delete procedure (human)

Only after `git cherry` shows all `-` for that branch:

```bash
# optional archive tag for audit trail
git tag archive/<branch-name> <branch-tip-sha>

git branch -d <branch>           # local
git push origin --delete <branch>  # remote — human confirms each
```

Use `-D` only when you have verified the branch is fully merged or intentionally
abandoned **and** tagged.

---

## What agents may do

- List candidates with `git cherry` evidence
- Open a Chief `BuildApprovalRequest` if branch deletion is part of a gated cleanup
- Log findings to Build Log / `knowledge/log.md` when a durable lesson emerges

## What agents must not do

- Auto-delete branches or close PRs without explicit human go
- Delete because a branch "looks stale" without `git cherry`
- Force-push as a substitute for hygiene — see
  [HISTORY_REWRITE_AND_FORCE_PUSH.md](HISTORY_REWRITE_AND_FORCE_PUSH.md)

---

## Related

- `docs/AGENT_RUNBOOK.md` § Repo hygiene workflow
- `docs/internal/repo-hygiene-report.md` — what is wired vs `not_wired`
- Lesson: `knowledge/lessons/history-rewrite-and-branch-prune.md`
- Lesson: `knowledge/lessons/github-stacked-branch-autoclose.md`
