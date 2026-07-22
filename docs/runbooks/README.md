# Repo maintenance runbooks

Executable procedures for **history rewrites**, **backups**, **branch hygiene**,
**incident recovery**, and **branching/release** on `truecrew-dashboard`.

## Rules (all runbooks)

- **Recovery before destruction** — establish and verify a rollback path *before* any
  rewrite, force-push, or branch delete.
- **Preserve by default** — open-PR, review, snapshot, and keeper branches stay until
  individually proven safe.
- **Human-only destructive steps** — agents document commands in **Ops to run**;
  they do **not** auto force-push, auto-delete branches, or run `git filter-repo`
  without explicit human approval.
- **Re-verify state immediately before acting** — a merge or push can land between
  plan and execution ([knowledge/lessons/reverify-state-before-acting.md](../../knowledge/lessons/reverify-state-before-acting.md)).

## Runbook index

| Runbook | Use when |
|---|---|
| [BACKUP_MIRROR_AND_ROLLBACK.md](BACKUP_MIRROR_AND_ROLLBACK.md) | Before any risky git operation; need full-repo rollback |
| [HISTORY_REWRITE_AND_FORCE_PUSH.md](HISTORY_REWRITE_AND_FORCE_PUSH.md) | Scrubbing identifiers/cruft from history; pushing rewritten SHAs |
| [BRANCH_HYGIENE_AND_SAFE_PRUNE.md](BRANCH_HYGIENE_AND_SAFE_PRUNE.md) | Auditing stale branches; deciding what may be deleted |
| [INCIDENT_RECOVERY.md](INCIDENT_RECOVERY.md) | Repo state is ambiguous, partially lost, or post-incident |
| [BRANCHING_AND_RELEASE.md](BRANCHING_AND_RELEASE.md) | Normal feature work, PRs, merges to `main` |

## Second brain (pointers only)

Behavior-changing lessons and where-things-live maps live in `knowledge/` — they link
here, they do not duplicate these steps:

- [knowledge/reference/operations-index.md](../../knowledge/reference/operations-index.md)
- [knowledge/lessons/history-rewrite-and-branch-prune.md](../../knowledge/lessons/history-rewrite-and-branch-prune.md)

## Related repo docs

- `docs/AGENT_RUNBOOK.md` — agent operating contract, Change Control, approval gates
- `docs/AGENT_WORKFLOW.md` — PR workflow, Ops to run rule
- `docs/PR_SUMMARY_TEMPLATE.md` — PR description template
