# REPO_RULES

Hard governance for True Crew. Agents and bots must obey these rules.
If a rule is unclear, **stop**. Do not invent a workaround.

---

## Non-negotiables

1. **Only deployable serverless entrypoints may live in top-level `/api`.**
   Each file under `/api` must be a real Vercel handler (`export default`).
2. **Shared logic lives outside `/api`.**
   Put helpers, utilities, mappers, stores, and tests in `/lib`, `/src/lib`, `/tests`, or a shared package — never under `/api`.
3. **Vercel Hobby: ≤ 12 serverless functions.**
   Count every deployable file under `/api` before merge or deploy. Over 12 is a hard fail.
4. **Backup, WIP, and safety branches/remotes are protected.**
   Do not delete, force-push, or rewrite them unless merge, patch-equivalence, or archival is **individually proven**.
5. **Production Vercel secrets are never touched during cleanup.**
   No create, update, delete, rotate, or “sync” of production env secrets unless a human explicitly orders it outside cleanup work.
6. **Destructive actions require human approval.**
   Delete, force-push, reset, rewrite history, secret changes, production deploy, and branch/remote removal are blocked without an explicit human go-ahead.
7. **Fail closed.**
   Ambiguity, missing proof, or conflicting instructions → stop and report. Do not proceed.

---

## Allowed actions

- Add or edit code via PR on a feature branch
- Move non-endpoint code **out of** `/api` into `/lib` or `/src/lib`
- Consolidate endpoints with rewrites so public URLs stay intact **and** function count stays ≤ 12
- Run `npm run verify` (lint + test + build)
- Open/update PRs; push non-protected feature branches
- Read docs, logs, and CI status
- Propose cleanup plans before changing code

## Blocked actions

- Placing helpers, utilities, shared modules, tests, or scratch files under `/api`
- Adding a serverless entrypoint that pushes deployable `/api` count above **12**
- Deleting or force-pushing backup / WIP / safety branches or remotes without proven merge, equivalence, or archival **plus** human approval
- Touching production Vercel secrets (or any production secret store) during cleanup
- Destructive git or infra actions without human approval
- Silent “best guess” when rules conflict or proof is missing
- Inventing features, env values, or deploy claims not present in the repo or the ask

---

## Required checks before cleanup

- [ ] Inventory every file under `/api` — confirm each is a deployable entrypoint
- [ ] List any non-endpoint code under `/api` and the destination path outside `/api`
- [ ] Count deployable functions **before** and **after**; after must be ≤ 12
- [ ] Name every branch/remote that would be affected; prove each is safe or leave it alone
- [ ] Confirm the plan does **not** touch production Vercel secrets
- [ ] Write a short plan first; if anything is ambiguous, **stop and report**

## Required checks before deploy

- [ ] Deployable `/api` function count ≤ 12
- [ ] No non-entrypoint files under `/api`
- [ ] `npm run verify` passes (or known pre-existing failures are documented, not ignored)
- [ ] Public API URLs still resolve (rewrites verified if consolidation occurred)
- [ ] No production secret create/update/delete in this change
- [ ] PR reviewed; human approved merge/deploy when required by workflow

## Human approval gate

**Require an explicit human yes before any of:**

| Action | Examples |
|--------|----------|
| Destructive git | `git push --force`, history rewrite, hard reset of shared branches |
| Branch/remote removal | Deleting `backup/*`, WIP, or safety refs |
| Secret changes | Vercel/Supabase/GitHub production env vars or secrets |
| Production deploy / promotion | Shipping to production outside normal approved PR flow |
| Irreversible data/schema | Production migrations or data deletion |
| Rule overrides | Any intentional exception to this file |

No approval on record → **do not do it**.

---

## Function count (Hobby)

```bash
find api -name '*.ts' -o -name '*.js' | sort
# Must print ≤ 12 paths. Each path = one serverless function.
```

Prefer consolidating via existing handlers + `vercel.json` rewrites over adding new `/api` files.

---

## Precedence

1. This file (`REPO_RULES.md`) for hard safety constraints
2. `docs/AGENT_WORKFLOW.md` / `docs/AGENT_RUNBOOK.md` for approval routing
3. `CLAUDE.md` for product/coding context

If those conflict on safety, **this file wins**. Then stop and ask a human.
