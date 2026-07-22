# History rewrite and force-push

**Goal:** Remove committed cruft or identifiers from **all** history when a normal
forward fix is insufficient — without losing the ability to roll back.

**Human-only:** rewrite execution, force-push, and branch-protection changes. Agents
document the plan and **Ops to run** commands; they do not run destructive steps.

---

## Prerequisites (all required)

1. Complete [BACKUP_MIRROR_AND_ROLLBACK.md](BACKUP_MIRROR_AND_ROLLBACK.md) — mirror
   verified, stash bundle saved.
2. Confirm whether any **new merges landed on `main`** since the rewrite was planned.
   A pre-merge rewrite snapshot is stale the moment `main` moves — **re-run** the scrub
   against current `main`, do not push an old snapshot.
3. List branches in scope — decide explicitly which remote branches will be rewritten
   vs left alone vs deleted instead of pushed.
4. Branch protection: note which rules block force-push on `main` (GitHub → Settings →
   Branches). Protection must be adjusted **temporarily by a human**, then re-enabled.

---

## Dry run first

```bash
git filter-repo --dry-run <your-args>
```

Diff a filtered export against the original backup mirror before the real run.

---

## Typical filter-repo pattern

Example shape only — adjust paths and redaction rules to the audit:

```bash
git filter-repo --force \
  --invert-paths \
  --path <paths-to-remove> \
  --replace-text <redaction-rules-file> \
  --replace-message <redaction-rules-file>
```

**Side effects to expect:**

- All rewritten commits get **new SHAs**
- `origin` remote may be removed — re-add manually after
- Reflog expired; aggressive GC — mirror backup is the rollback

---

## Post-rewrite verification (in rewritten repo)

```bash
# identifier absent from all branch tips
git grep -I <identifier> $(git for-each-ref --format='%(objectname)' refs/heads)

# identifier absent from all history
git log --all --oneline -S <identifier>

# purged paths absent from all objects
git rev-list --all --objects | grep -E '<purged-path-pattern>'

git fsck --full
```

Record results before any push.

---

## Force-push (human runs — never automated)

Use **explicit branch list**, not blind `--mirror`:

```bash
# dry run — list what WOULD be pushed
while read b; do echo "would push $b"; done < .git/BRANCHES-TO-PUSH.txt

# real push — force-with-lease (aborts if remote moved unexpectedly)
while read b; do
  git push --force-with-lease origin "refs/heads/$b:refs/heads/$b"
done < .git/BRANCHES-TO-PUSH.txt
```

**Do not** use `git push --mirror` unless you intend to publish every local ref and
delete remote refs not present locally.

After push:

```bash
git fetch origin --prune
```

---

## Collaborator reset (after remote rewrite)

Anyone with an old clone must re-clone or hard-reset — plain `git pull` can merge old
history back in:

```bash
git fetch origin --prune
git checkout <branch>
git reset --hard origin/<branch>
```

Full re-clone is safest for most collaborators.

---

## Open PRs and stale branches

- Open PRs against rewritten branches will show rewritten commits; many may need
  close/reopen or rebase.
- Consider **deleting stale branches** instead of force-pushing them — see
  [BRANCH_HYGIENE_AND_SAFE_PRUNE.md](BRANCH_HYGIENE_AND_SAFE_PRUNE.md).

---

## Related

- [BACKUP_MIRROR_AND_ROLLBACK.md](BACKUP_MIRROR_AND_ROLLBACK.md)
- [BRANCH_HYGIENE_AND_SAFE_PRUNE.md](BRANCH_HYGIENE_AND_SAFE_PRUNE.md)
- Lesson: `knowledge/lessons/history-rewrite-and-branch-prune.md`
