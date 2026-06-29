# Agent ↔ Approver workflow

True Crew work is split into two roles. **Agents and scripts do the work.** The **approver** only reviews and approves outputs.

## Roles

| Role | Does | Does not |
|------|------|----------|
| **Approver** (you) | Approve/reject PRs, summaries, checklists, decision notes | Run shell commands, click through UI setup, create vault folders manually |
| **Agent** (Cursor / automation) | Implement code, config, scripts; open PRs; update Obsidian via scripts | Ask the approver to run commands or perform manual setup |

## Agent checklist (every task)

1. **Implement** — Make the change in the repo (code, scripts, config, docs).
2. **Queue ops commands** — If a command must run outside the agent environment (deploy keys, Vercel env vars, first-time vault path, etc.), add it to:
   - an Obsidian ops checklist (see [10_INTEGRATIONS/GitHub-Workflow.md](vault-templates/10_INTEGRATIONS/GitHub-Workflow.md)), or
   - a repo script (e.g. `scripts/setup-obsidian-vault.ts`),
   - and label the section **`Ops to run`**.
3. **Open a PR** — Use [PR_SUMMARY_TEMPLATE.md](PR_SUMMARY_TEMPLATE.md). Include: what changed, why, risks/follow-ups.
4. **Update Obsidian** (when vault is configured) — Log decisions, PRs, and hot context via `npm run obsidian:log`.
5. **Never delegate manual work** — Do not ask the approver to run commands, create notes, or click through setup UIs.

## Approver checklist (every task)

1. Review the PR summary (what / why / risk).
2. Approve or request changes on the PR.
3. If the PR includes an **Ops to run** section, approve or edit the ops checklist in Obsidian (`10_INTEGRATIONS/GitHub-Workflow.md`).
4. Approve or edit any **decision notes** linked from the PR.

## Where things live

| Artifact | Location |
|----------|----------|
| Agent workflow (repo) | `docs/AGENT_WORKFLOW.md` (this file) |
| PR summary template | `docs/PR_SUMMARY_TEMPLATE.md` |
| Vault templates (seed source) | `docs/vault-templates/` |
| Ops checklists (live vault) | `10_INTEGRATIONS/GitHub-Workflow.md` and siblings |
| Decision notes (live vault) | `Decisions/{YYYY-MM-DD} — {title}.md` |
| Hot context (live vault) | `True Crew/Hot Context.md` |
| Obsidian write CLI | `npm run obsidian:log` |
| Vault seed script | `npm run obsidian:setup-vault` |

## Bootstrapping the Obsidian vault

Agents run (or document for ops automation):

```bash
# On your Mac, copy .env.example → .env.local (or rely on auto-detect when vault exists)
npm run obsidian:setup-vault
```

This copies workflow templates from `docs/vault-templates/` into the live vault without overwriting existing files.

## Logging after merge

When a PR merges, agents (or CI hooks, when wired) should append to the vault:

```bash
npm run obsidian:log -- pr --number <n> --title "<title>" --status merged --url "<url>"
npm run obsidian:log -- decision --title "<decision title>" --decision "<outcome>" --context "<why>"
```

See [OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md) for full CLI reference.
