---
title: Operations Index — where maintenance, recovery, and branch-hygiene knowledge lives
type: reference
status: active
confidence: high
related_pages: [repair-playbook, history-rewrite-and-branch-prune]
related_prs: []
last_reviewed: 2026-07-21
---

# Operations Index

A **pointer map**, not a procedure store. **Repo runbooks are the canonical,
executable source** for maintenance steps. Second-brain notes capture lessons and
where-things-live; they link here, never duplicate the steps — copied procedures
drift (see [lessons/check-code-not-runbook-prose.md](../lessons/check-code-not-runbook-prose.md)).

---

## Executable runbooks (canonical)

Start at [`docs/runbooks/README.md`](../../docs/runbooks/README.md).

| Topic | Runbook |
|---|---|
| Backup / rollback | `docs/runbooks/BACKUP_MIRROR_AND_ROLLBACK.md` |
| History rewrite / force-push | `docs/runbooks/HISTORY_REWRITE_AND_FORCE_PUSH.md` |
| Branch hygiene / safe prune | `docs/runbooks/BRANCH_HYGIENE_AND_SAFE_PRUNE.md` |
| Incident recovery | `docs/runbooks/INCIDENT_RECOVERY.md` |
| Branching / release | `docs/runbooks/BRANCHING_AND_RELEASE.md` |

**Human-only destructive steps:** force-push, branch delete, `git filter-repo` execution.
Agents prepare **Ops to run**; they do not auto force-push or auto-delete.

---

## Other canonical repo docs

| Topic | Path |
|---|---|
| Agent operating contract | `docs/AGENT_RUNBOOK.md` |
| PR workflow | `docs/AGENT_WORKFLOW.md`, `docs/PR_SUMMARY_TEMPLATE.md` |
| Chief / role map | `docs/agents/CHIEF_OPERATING_SYSTEM.md` |
| Verification standard (live vs mock) | `docs/AGENT_CAPABILITIES_SUMMARY.md` |
| Chief runtime truth | `docs/internal/chief-command-center-runtime-truth.md` |
| Repo hygiene signals (`not_wired`) | `docs/internal/repo-hygiene-report.md` |
| Proposed repo-health bot | `docs/internal/agent-bot-compliance-plan.md` |

---

## Second-brain lessons and references

| Topic | Vault page |
|---|---|
| History rewrite / branch prune pattern | [lessons/history-rewrite-and-branch-prune.md](../lessons/history-rewrite-and-branch-prune.md) |
| Re-verify before acting | [lessons/reverify-state-before-acting.md](../lessons/reverify-state-before-acting.md) |
| Stacked-branch auto-close | [lessons/github-stacked-branch-autoclose.md](../lessons/github-stacked-branch-autoclose.md) |
| Degraded-condition fixes | [reference/repair-playbook.md](repair-playbook.md) |
| Tool routing / fallbacks | [reference/tool-fallbacks.md](tool-fallbacks.md), `docs/TOOL_CATALOG.md` |
| Unified command/search | [reference/unified-command-search.md](unified-command-search.md) |
| Vault governance | [concepts/second-brain-workflow.md](../concepts/second-brain-workflow.md) |

---

## Rules summary (details in runbooks)

- **Back up before any history rewrite or force-push**; verify mirror + stash bundle first.
- **Never delete a branch until preservation is proven** (`git cherry main <branch>` all `-`).
- **Preserve by default:** open-PR, review, snapshot, and keeper branches.
- **Recovery before further destruction** if state is ambiguous.

Full pattern: [lessons/history-rewrite-and-branch-prune.md](../lessons/history-rewrite-and-branch-prune.md).
