---
title: History rewrite and branch prune — back up first, prove safety before delete
type: lesson
status: active
confidence: high
source_workflow: Repo secrets-scrub + git-filter-repo history rewrite + branch-prune cleanup
source_agent: Build
category: recovery-pattern
related_pages: [operations-index]
related_prs: [186]
last_reviewed: 2026-07-21
---

## Rule

Before any destructive git operation (history rewrite, force-push, branch delete):
1. **Back up first** — full `git clone --mirror` to a timestamped path *outside* the
   repo, before touching history. Verify it (`for-each-ref` count, an original SHA).
2. **Preserve loose work** — bundle stashes/uncommitted/​dangling commits
   (`git fsck --unreachable`, `git bundle create`) before clearing anything. A mirror
   clone captures only the top of the stash stack, not the whole stack.
3. **Never delete a branch until its preservation is proven individually** — run
   `git cherry main <branch>`: only branches whose commits are all `-` (already in
   main by patch) are safe. Any `+` means unique work → do not delete.
4. **Recovery comes before any further destructive step** — if state is ambiguous or
   something looks off, stop and re-establish the recovery path before continuing.

## Deletion rule (who stays, by default)

Preserve unless proven safe, per category:
- **Open-PR branches** → preserve (they back live review work).
- **Review branches** → preserve until inspected one-by-one and landed or retired.
- **Snapshot/backup branches** (self-labeled `wip/…`, `backup/…`) → tag
  (`git tag archive/<name> <sha>`) *before* any delete, so commits stay recoverable.
- **Keeper branches** (substantive unmerged work) → preserve until landed or
  explicitly retired.
- Only a branch that is **merged into main** or **patch-equivalent already in main**
  (`git cherry` all `-`) is a safe delete.

## What happened

A secrets/identifier scrub required rewriting history across every branch. It was run
in-place on the live repo (justified: unpushed local-only branches existed nowhere
else). Separately, a PR merged into `main` *after* a pre-merge rewrite was already
computed — force-pushing that stale rewrite would have clobbered the merge.

## What was risky

- Rewriting the only copy of 60+ local-only branches in place.
- `git stash clear` during prep — a mirror backup preserves only `stash@{0}`, so the
  other stashes would have been lost without a separate bundle.
- git-filter-repo does **not** create `refs/original` and expires reflogs + runs
  `gc --prune=now`, so reflog is **not** a recovery path — the mirror backup is.
- A pre-merge rewrite snapshot is stale the moment new work merges to `main`.

## What worked

- Timestamped mirror backup + a stash/dangling-commit bundle, both verified, before
  any rewrite. Full rollback = `git clone <mirror>`.
- `--dry-run` filter-repo, diffing the filtered vs original export, before the real run.
- `git cherry main <branch>` proved every prune candidate still held unique commits →
  **zero** blind deletes.
- When a merge landed after the rewrite, the fix was to **re-run** the scrub against
  the new `main`, not to push the stale snapshot.

## Why

Destructive git operations are only as safe as the recovery path that exists *before*
them. Backups and per-branch proof turn an irreversible mistake into a reversible one;
skipping them is exactly where a cleanup becomes an incident. Deleting on assumption
(“it looks merged/stale”) loses work that `git cherry` would have shown was unique.

## Related

- Executable procedures: `docs/runbooks/README.md` (start here — not this lesson)
- [reference/operations-index.md](../reference/operations-index.md) — pointer map
- [lessons/reverify-state-before-acting.md](reverify-state-before-acting.md) — re-check
  real state right before acting (a merge can land between plan and push).
- [reference/repair-playbook.md](../reference/repair-playbook.md) — degraded-condition
  fixes/fallbacks.
