# Branching and release

**Goal:** Normal feature delivery on `truecrew-dashboard` — branches, PRs, merges to
`main` — without bypassing Chief approval gates.

---

## Default workflow

1. **Branch from current `main`** (or an explicitly approved stacked base — see stacked-branch lesson).
2. **Small, reversible slices** — one concern per PR where practical.
3. **Open PR** using `docs/PR_SUMMARY_TEMPLATE.md` — what / why / risks / test plan / Ops to run.
4. **Chief gate** — merges to `main`, migrations, and production deploys require an
   approved `BuildApprovalRequest` card (`docs/AGENT_RUNBOOK.md`, `src/components/chief/agentApprovalGates.ts`).
5. **Merge** only after human approval on the card and PR review.

Agents implement and open PRs; they do not merge to `main` or deploy without a cleared card.

---

## Branch naming (conventions in use)

| Prefix | Typical use |
|---|---|
| `cursor/` | Cursor agent feature work |
| `build/` | Build-agent scoped fixes |
| `chore/` | Tooling, config, non-feature upkeep |
| `claude/` | Claude agent slices |
| `feat/` | User-facing features |
| `fix/` | Bug fixes |
| `backup/`, `wip/` | Snapshot branches — tag before any delete |

No enforced linter — match the nearest existing pattern in the repo.

---

## Before starting work

Per Build Agent operating checklist (`docs/AGENT_RUNBOOK.md`):

```bash
git status
git branch --show-current
git fetch origin
```

Confirm no uncommitted surprise and whether `main` moved since planning.

---

## Stacked branches

If PR B is based on unmerged PR A's branch:

- Merging/deleting branch A **auto-closes** PR B on GitHub
- Recovery: `knowledge/lessons/rebase-and-reopen-recovery.md`

Prefer branching from `main` when possible.

---

## Release / deploy

Production deploys are **human-gated** and outside routine agent execution:

- Vercel Git deploys from `main` (typical)
- Env secrets and rotation — human-only (`docs/AGENT_RUNBOOK.md` External Services)
- Post-merge: `npm run obsidian:log` when vault is configured (`docs/OBSIDIAN_LOGGING.md`)

---

## Repo hygiene (separate from feature flow)

Stale branch audits, history rewrites, and force-push are **not** part of normal release —
see `docs/runbooks/README.md`.

---

## Related

- `docs/AGENT_WORKFLOW.md`
- `docs/PR_SUMMARY_TEMPLATE.md`
- `knowledge/lessons/github-stacked-branch-autoclose.md`
- `knowledge/lessons/reverify-state-before-acting.md`
