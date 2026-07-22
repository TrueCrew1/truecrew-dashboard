# Incident recovery

**Goal:** Restore a known-good state when git/repo operations go wrong, data is
ambiguous, or a destructive step was started without a verified backup.

**First rule:** stop further destructive steps until the recovery path is re-established.

---

## Stop and assess

1. **Stop** — no more force-push, filter-repo, `git gc`, stash clear, or branch deletes.
2. **Identify what is lost vs recoverable:**
   - Mirror backup exists? → full rollback possible
   - Stash bundle exists? → dangling/stash work recoverable
   - Only local working tree? → check reflog *before* any GC (may be empty post-filter-repo)
3. **Record** current branch, `git status`, and last known good SHAs.

---

## Recovery paths (in order of preference)

### A — Full mirror restore

If [BACKUP_MIRROR_AND_ROLLBACK.md](BACKUP_MIRROR_AND_ROLLBACK.md) was followed:

```bash
git clone /path/to/truecrew-dashboard-backup-mirror-<TS>.git truecrew-dashboard-restored
```

This is the authoritative undo for a bad rewrite.

### B — Stash / unreachable bundle

```bash
git fetch /path/to/backup-stashes-<TS>.bundle 'refs/preserved-stashes/*:refs/preserved-stashes/*'
```

### C — Reflog (only if not expired)

```bash
git reflog
git checkout -b recovery/<name> <sha>
```

**Not reliable** after `git filter-repo` or aggressive `gc --prune=now`.

### D — Remote still has pre-rewrite history

If rewrite was **not** pushed, `origin` may still hold old SHAs:

```bash
git fetch origin
git checkout -b recovery/from-origin origin/<branch>
```

If rewrite **was** pushed, collaborators need re-clone or hard-reset per
[HISTORY_REWRITE_AND_FORCE_PUSH.md](HISTORY_REWRITE_AND_FORCE_PUSH.md).

---

## Post-merge stale rewrite

If `main` merged new work **after** a rewrite was computed but **before** push:

- Do **not** push the stale rewrite snapshot
- Re-run the scrub against current `main`
- Re-verify with the post-rewrite checks in
  [HISTORY_REWRITE_AND_FORCE_PUSH.md](HISTORY_REWRITE_AND_FORCE_PUSH.md)

---

## Application / deploy incidents

Repo maintenance runbooks cover **git state**. For runtime incidents:

- `knowledge/reference/repair-playbook.md` — known degraded conditions
- `docs/internal/chief-command-center-runtime-truth.md` — live vs scaffold map
- Vercel runtime errors — read-only check per `knowledge/concepts/vercel-status-checks.md`

---

## After recovery

1. Log what happened (Build Log + `knowledge/log.md` if a lesson emerged)
2. Update or add a `knowledge/lessons/*.md` entry if behavior should change
3. Do not repeat the operation until backup + dry-run checklist passes

---

## Related

- [BACKUP_MIRROR_AND_ROLLBACK.md](BACKUP_MIRROR_AND_ROLLBACK.md)
- [HISTORY_REWRITE_AND_FORCE_PUSH.md](HISTORY_REWRITE_AND_FORCE_PUSH.md)
- Lesson: `knowledge/lessons/reverify-state-before-acting.md`
