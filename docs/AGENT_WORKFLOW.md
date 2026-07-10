# Agent ↔ Approver workflow

**Start a new session with [EXECUTION_KIT.md](EXECUTION_KIT.md)** — lane routing (which
tool/agent handles what) and copy-paste kickoff prompts.

**Agent ecosystem law (roles, Chief foreman model, prompts):**
[AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md). This file covers PR/approver process;
Build/Research approval technical detail lives in
[AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md).

**Chief's Priority/Task intake discipline and the Second Brain vault (`knowledge/`) —
Lessons, Memory Review Pass, Research filing tiers — are not covered above; they live in
[AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) and [AGENT_LANES_INTERNAL.md](AGENT_LANES_INTERNAL.md).**
Chief must run AGENT_RUNBOOK.md's Chief Intake Rule (active Priority/Task check) in
addition to AGENT_CONSTITUTION.md's session-start steps, not instead of them — the two
docs cover different, non-overlapping parts of Chief's startup behavior.

True Crew work is split into two roles. **Agents and scripts do the work.** The **approver** only reviews and approves outputs.

## Approval routing (Chief only)

No agent — Planner, Build, Research, Content, or any future one — asks the approver for a decision directly. Every approval routes through **Chief**:

1. The agent builds a request object for its role (`PlannerApprovalRequest`, `BuildApprovalRequest`, `ResearchApprovalRequest`, `ContentApprovalRequest` — see `src/components/chief/agentApprovalGates.ts`).
2. It passes that request through the matching `createApprovalCardFrom*Request()` helper, which maps it into an `ApprovalCard` (title, summary, checklist, recommended decision, source).
3. Chief renders the card in the Chief Approval Panel (Chief → Approvals tab, in-app). The approver only ever sees and decides through cards there — never a direct ask from an agent.

`APPROVAL_GATES` in that same file lists which actions per agent require a card (e.g. Build: any change merging to `main` or a migration; Content: anything external-facing). Actions not listed there are routine enough for the agent to just do.

This pass wires the pattern with one example request per agent (illustrative, not live agent output yet) — the pattern is the deliverable, not a full integration.

### Validated approval loops (Build + Research)

Build and Research each have a **runtime QA trigger** that exercises the full path
(trigger → shared queue → Chief Approvals → Chief Agents awaiting → operator
decision). Approval records the decision only — it does not execute agent work.

See **[AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md)** for system law, concrete
triggers, urgency signals, known limitations (including stable-ID re-propose), and
rules for agents and tools.

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
| Execution Kit (start-here, lanes, kickoff prompts) | `docs/EXECUTION_KIT.md` |
| Agent constitution + operating playbook | `docs/AGENT_CONSTITUTION.md` |
| Agent workflow (repo) | `docs/AGENT_WORKFLOW.md` (this file) |
| Agent approval loops (Build + Research) | `docs/AGENT_APPROVAL_LOOPS.md` |
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
