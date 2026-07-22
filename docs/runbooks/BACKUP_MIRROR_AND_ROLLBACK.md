# Backup mirror and rollback

**Goal:** Create a verified, out-of-repo backup before any destructive git work so
the entire pre-operation state can be restored.

**Agents:** prepare commands and verification steps; **human runs** backup creation
and any restore.

---

## When to run

- Before `git filter-repo`, history rewrite, or any planned force-push
- Before bulk branch deletes or aggressive `git gc`
- When repo state is ambiguous and you need a known-good snapshot first

---

## Step 1 — Mirror backup (full repo)

Run from a directory **outside** the working repo:

```bash
TS=$(date +%Y%m%d-%H%M%S)
git clone --mirror /path/to/truecrew-dashboard \
  /path/to/truecrew-dashboard-backup-mirror-${TS}.git
```

**Verify** (record output in your ops log):

```bash
MIRROR=/path/to/truecrew-dashboard-backup-mirror-${TS}.git
git --git-dir="$MIRROR" for-each-ref --format='%(refname)' | wc -l
git --git-dir="$MIRROR" rev-parse refs/heads/main
git --git-dir="$MIRROR" rev-parse refs/heads/<current-branch>
```

Keep the mirror path in a durable note until the operation is confirmed successful.

---

## Step 2 — Stash and dangling-work bundle

A mirror captures branch tips and the **top** stash entry only. Bundle the full stash
stack and unreachable commits before clearing anything:

```bash
TS=$(date +%Y%m%d-%H%M%S)
cd /path/to/truecrew-dashboard
git bundle create /path/to/truecrew-dashboard-backup-stashes-${TS}.bundle --all
```

Optional — list what you are preserving:

```bash
git stash list
git fsck --unreachable | head
```

---

## Step 3 — Rollback (restore entire original repo)

If the live working copy must be discarded:

```bash
git clone /path/to/truecrew-dashboard-backup-mirror-<TS>.git truecrew-dashboard-restored
cd truecrew-dashboard-restored
git remote add origin git@github.com:TrueCrew1/truecrew-dashboard.git  # if needed
```

---

## Step 4 — Recover bundled stashes

```bash
git fetch /path/to/truecrew-dashboard-backup-stashes-<TS>.bundle \
  'refs/preserved-stashes/*:refs/preserved-stashes/*'
git log --oneline --all | grep -E 'WIP on|On '   # find target commit
git stash apply <sha>                            # stash-format commits apply directly
```

---

## What is NOT a recovery path

After `git filter-repo`, do **not** rely on:

- `refs/original/*` — filter-repo does not create these by default
- Reflog — filter-repo may expire reflogs and run aggressive GC
- The in-place working repo alone — objects may be pruned

The **mirror backup** is the authoritative rollback.

---

## Related

- [HISTORY_REWRITE_AND_FORCE_PUSH.md](HISTORY_REWRITE_AND_FORCE_PUSH.md)
- [INCIDENT_RECOVERY.md](INCIDENT_RECOVERY.md)
- Lesson: `knowledge/lessons/history-rewrite-and-branch-prune.md`
