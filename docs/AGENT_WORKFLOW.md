# Agent ↔ Approver workflow

True Crew work is split into two roles. **Agents and scripts do the work.** The **approver** only reviews and approves outputs.

## Approval routing (Chief only)

No agent — Planner, Build, Research, Content, or any future one — asks the approver for a decision directly. Every approval routes through **Chief**:

1. The agent builds a request object for its role (`PlannerApprovalRequest`, `BuildApprovalRequest`, `ResearchApprovalRequest`, `ContentApprovalRequest` — see `src/components/chief/agentApprovalGates.ts`).
2. It passes that request through the matching `createApprovalCardFrom*Request()` helper, which maps it into an `ApprovalCard` (title, summary, checklist, recommended decision, source).
3. Chief renders the card in the Chief Approval Panel (Chief → Approvals tab, in-app). The approver only ever sees and decides through cards there — never a direct ask from an agent.

`APPROVAL_GATES` in that same file lists which actions per agent require a card (e.g. Build: any change merging to `main` or a migration; Content: anything external-facing). Actions not listed there are routine enough for the agent to just do.

This pass wires the pattern with one example request per agent (illustrative, not live agent output yet) — the pattern is the deliverable, not a full integration.

## Phase 1 operating pattern

Given the access links formalized in `docs/AGENT_RUNBOOK.md` § Chief ("Chief
access links — phase 1"), the current operating pattern for any Chief-adjacent
work is:

- **Sustained / automated LLM work first via Azure router** (DeepSeek / Kimi /
  gpt-5-mini via `npm run llm` or product Research/Builder paths —
  [docs/AI_STACK.md](AI_STACK.md)). Azure credits expire next month — default bulk
  work here; keep Pro tools for judgment.
- **Filter with free tools before premium chat** — ChatGPT / Gemini / Grok / Kimi /
  DeepSeek free web chats for second opinions; escalate to Claude Pro, Cursor Pro,
  or Perplexity Pro when judgment, multi-file work, or live web evidence requires it
  ([docs/TOOL_CATALOG.md](TOOL_CATALOG.md) § LLM usage policy).
- **Local day-to-day chat via Open WebUI** (over Ollama) — preferred local surface;
  Continue.dev is secondary in-editor fallback only. Open WebUI is local-only — not
  a dashboard runtime integration.
- **Log/brief to Obsidian** — the audit trail and status-brief sink for
  anything worth remembering ([docs/OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md)).
- **Execute repo changes only through the Claude Code / Cursor PR flow** — no write
  happens outside the existing PR-only, approval-gated path below. GitHub Copilot is
  **paused** — do not reinstall by default; only if David explicitly re-approves later.
- **Escalate anything beyond those bounds** — a new external-system link, a
  write-path permission, or anything not covered by this phase's three
  formalized surfaces goes to David as an explicit decision, not an inferred
  extension.

**Stack brief for agents:** [docs/agents/CHIEF_OPERATING_SYSTEM.md](agents/CHIEF_OPERATING_SYSTEM.md).
**Product vs personal tools:** product runtime SoT is
`lib/ops/integrationsInventory.ts` (Slack there = **outbound webhook only**);
personal/editor/local SoT is `docs/TOOL_CATALOG.md` (Slack inbound/bot =
`future-integration` — intentional split).

**[docs/AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) is the full operating contract for Planner, Build, Research, Content, and Chief** — read it before operating as any of these agents, and give it to a new agent session as-is. It defines, per agent: purpose and scope, what's allowed without approval (routine, reversible work), what requires a Chief approval gate (state-changing, external, or hard-to-revert work — e.g. Build's merges/migrations, Content's client-facing copy), the exact fields each `*ApprovalRequest` needs, and what to verify before asking for approval. It also defines Chief's own responsibilities (turning requests into cards, checking claims rather than trusting them, never auto-merging/deploying/messaging), when an agent must stop and escalate rather than proceed, how the runbook itself gets changed (a PR, routed through Chief like any other approval-gated change), and — since this pass — how agents turn work artifacts into the `knowledge/` vault (**Second Brain Starter Pass**).

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
