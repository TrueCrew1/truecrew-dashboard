# Execution Kit (v1)

Start-here doc for any new Claude Code / agent session on True Crew. Covers how to
operate, which tool/agent ("lane") should handle a given piece of work, and copy-paste
prompts to kick off a slice. This file does not restate
[AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) or [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md)
— read those for full detail.

## 1. Read order for a new session

1. `CLAUDE.md` (repo root) — auto-loaded; product, tone, coding preferences.
2. [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) — agent laws, Chief foreman model,
   roster, multi-pass workflow, copy-paste session prompts.
3. **This file** — lanes and kickoff prompts.
4. [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) — agent/approver roles, PR process.
5. [AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md) — Build/Research approval
   technical reference. Read before touching anything in `src/components/chief/`.
6. [.claude/project-rules.md](../.claude/project-rules.md) and
   [.claude/workflow-checklists.md](../.claude/workflow-checklists.md) — scoping/tone
   rules and per-task-type checklists.
7. **If operating as Chief, Research, or Filing/Second Brain specifically** —
   also read [AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) (Chief Intake Rule, Second Brain
   vault), [AGENT_LANES_INTERNAL.md](AGENT_LANES_INTERNAL.md) (lane definitions for
   `knowledge/` work), and, for Research,
   [RESEARCH_SECOND_BRAIN_WORKFLOW.md](RESEARCH_SECOND_BRAIN_WORKFLOW.md) +
   [OBSIDIAN_RESEARCH_INTAKE.md](OBSIDIAN_RESEARCH_INTAKE.md). Steps 1–6 above don't
   cover any of this — skipping this step for these three roles means missing real,
   already-defined rules, not just background reading.

## 2. Approval law — summary only

- **Chief is the only approval surface.** No agent asks the operator for a decision
  directly.
- **Human-in-the-loop, always.** The operator decides on Chief → Approvals. That
  decision is recorded — it does **not** execute agent work, create files, or advance a
  workflow.
- **One shared queue.** Every proposal (runtime, seeded, live) merges in
  `ChiefApprovalsContext`; Approvals, Agents-awaiting, and pending counts all read it.
- **Aging:** pending &gt; 24h → "Due soon"; pending &gt; 48h → "Overdue" + escalate.

If this summary ever conflicts with [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) or
[AGENT_APPROVAL_LOOPS.md](AGENT_APPROVAL_LOOPS.md), those files win — this is a pointer.

## 3. Lanes — which tool/agent does which kind of work

This split is new guidance introduced by this kit — it is not enforced by any committed
repo config (no `.continue/` rule files exist in this repo's history). Treat it as
operating convention, not tooling.

| Lane | Tool/surface | Good for | Not responsible for / must not |
|---|---|---|---|
| **Scout** | Continue (VS Code ext, local Ollama, this workspace) | Read-only checks: confirm file existence, quote exact visible labels/headings, run narrow greps, report exact matches | Inventing files/hooks/labels/metrics not present; generic summaries; architecture calls; editing files during inspect-only tasks |
| **Build** | VS Claude / Cursor (Claude Code in-editor) | Config/rule files, bounded slices *when given a written spec*, verifying other tools' claims by reading actual code, mechanical repo-scoped changes | Big architecture redesigns without a spec; acting on unverified Scout output |
| **Architecture/spec** | Primary Claude (main/web) | Turning asks or Scout reports into bounded slice specs, deciding a slice is truly COMPLETE, resolving contradictions between tools | Direct repo edits — no repo access |
| **Draft/QA text** | Free web tools (Kimi, DeepSeek, free ChatGPT, etc.) | Cheap text-only drafting/formatting of specs, runbooks, QA checklists that get pasted in | No repo access — never given repo paths, source, or secrets; doesn't execute or verify anything |

Scout is called out separately from Build rather than folded in, because its contract
(read-only, must report evidence, no architecture calls) is stricter than "build with a
spec" — this distinction exists specifically because Continue was once caught
fabricating a page summary with invented metrics and files.

## 4. Copy-paste kickoff prompts

**Build slice kickoff (Build lane):**
```
Lane: Build (VS Claude/Cursor). Spec: <paste spec from Architecture lane or write inline>.
Read docs/EXECUTION_KIT.md, .claude/project-rules.md, and
.claude/skills/truecrew-build/SKILL.md first.
Task: implement <feature/slice name> per the spec above, following the
Feature build checklist in .claude/workflow-checklists.md.
Do not touch src/components/chief/agentApprovalGates.ts or
ChiefApprovalsContext.tsx unless the spec explicitly calls for it — if it
does, read docs/AGENT_APPROVAL_LOOPS.md first and cite it in the PR.
When done: open a PR using docs/PR_SUMMARY_TEMPLATE.md, note any Ops to run.
```

**Bug fix kickoff (Build lane):**
```
Lane: Build (VS Claude/Cursor).
Bug: <observed behavior> vs expected: <expected behavior>.
Reproduce first — don't guess the cause. Use the Bug fix checklist in
.claude/workflow-checklists.md. If the fix touches Chief/approvals code,
read docs/AGENT_APPROVAL_LOOPS.md before changing it.
Report the root cause (not just the patch) in the PR summary
(docs/PR_SUMMARY_TEMPLATE.md).
```

**Scout inspection request (Scout lane):**
```
Lane: Scout (Continue, read-only).
Question: <e.g. "Does src/components/chief/ already have a helper for X?
What exact labels/headings appear on the Monitor page's Y panel?">
Rules: report only what you can verify by reading files in this repo. Do
not invent files, hooks, utilities, labels, metrics, or logging that aren't
actually present. Do not propose architecture. Do not edit any files.
Report back in exactly this format:
- Files inspected:
- Exact evidence (quotes/paths/line refs):
- Unsupported claims (things you could not verify):
- Confidence: high / medium / low
```

**Architecture/spec request (Architecture lane):**
```
Lane: Architecture/spec (Primary Claude, main/web).
Input: <rough ask, or a Scout report, or a contradiction between two tools'
output>.
Task: turn this into a bounded implementation spec for the Build lane —
scope, files likely touched, acceptance criteria, and any approval-gate
implications (check docs/AGENT_APPROVAL_LOOPS.md if it touches Chief/
approvals).
Output: a short spec (no code) that can be pasted directly into a
Build-kickoff prompt.
```

**Approval-loop QA verification (Build lane, cites system law directly):**
```
Lane: Build (VS Claude/Cursor) — QA verification.
Task: validate the Research Agent approval loop end-to-end per
docs/AGENT_APPROVAL_LOOPS.md's Research Agent loop table — trigger from the
Monitor page panel, confirm the card appears in Chief → Approvals and
Chief → Agents → Awaiting approval, and confirm QA-only wording appears
throughout (summary, checklist, requested action, panel intro).
Report pass/fail per step, citing exact file/line for any drift from the
documented behavior.
```

## 5. Checklists

Per-task-type checklists (feature build, bug fix, UI polish, refactor, deployment
readiness, docs update) live in
[.claude/workflow-checklists.md](../.claude/workflow-checklists.md) — not duplicated
here.

## 6. PR + logging

- PR descriptions: [docs/PR_SUMMARY_TEMPLATE.md](PR_SUMMARY_TEMPLATE.md).
- Post-merge Obsidian logging: [docs/OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md).

## 7. Relationship to `.claude/skills/*`

The `truecrew-build` / `truecrew-review` / `truecrew-research` / `truecrew-ship` skills
define task-phase behavior (what to do during build/review/research/ship). This kit
defines *which lane* — which tool/agent — should be doing that work. Different axes;
use both together.

## 8. Verifying edits to this kit

Docs-only changes still go through the repo's QA gate: run `npm run qa` (lint + build)
to confirm nothing under `src/` was accidentally touched.
