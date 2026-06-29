---
type: ticket
title: GitHub workflow — Ops checklist
summary: Pending ops commands awaiting approver sign-off before ops runs them.
source: true-crew
integration: github
status: approved
---

# GitHub workflow — Ops checklist

> **Approver:** review pending items below. Approve, edit, or reject each section.  
> **Agents:** append new items under **Ops to run** — never ask the approver to run commands directly in chat.

## Ops to run

<!-- Agents add pending commands here. Ops runs them after approver sign-off. -->

### Verify KnowledgePage — PR #45
- **Added:** 2026-06-29
- **PR:** #45
- **Why:** Confirm live vault notes appear in dashboard
- **Command:**
  ```bash
  npm run dev:vercel
  ```
- **Verify:** KnowledgePage shows 2 vault notes (`Agent Workflow`, `GitHub-Workflow`)
- **Approver:** [x] approved
- **Ops:** [ ] executed

### Template (agents: copy and fill)

```markdown
### [TASK-ID] Short title
- **Added:** YYYY-MM-DD
- **PR:** #NNN
- **Why:** one line
- **Command:**
  ```bash
  command here
  ```
- **Verify:** how to confirm success
- **Approver:** [ ] approved
- **Ops:** [ ] executed
```

---

## Completed ops

### Vault seed — PR #45
- **Added:** 2026-06-29
- **Completed:** 2026-06-29
- **PR:** #45
- **Result:** Seeded `10_INTEGRATIONS/GitHub-Workflow.md` and `True Crew/Agent Workflow.md`
- **Approver:** [x] approved
- **Ops:** [x] executed

---

## PR approval queue

| PR | Title | Agent summary | Approver |
|----|-------|---------------|----------|
| #45 | Verify obsidian:setup-vault and align seed templates with notes API | Vault seed + notes API contract alignment | approved |

---

## Notes

- Repo agent workflow: `docs/AGENT_WORKFLOW.md`
- PR summary template: `docs/PR_SUMMARY_TEMPLATE.md`
- Obsidian logging: `docs/OBSIDIAN_LOGGING.md`
