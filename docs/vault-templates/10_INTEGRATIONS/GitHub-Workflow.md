---
type: ticket
title: GitHub workflow — Ops checklist
summary: Pending ops commands awaiting approver sign-off before ops runs them.
source: true-crew
integration: github
status: pending-approval
---

# GitHub workflow — Ops checklist

> **Approver:** review pending items below. Approve, edit, or reject each section.  
> **Agents:** append new items under **Ops to run** — never ask the approver to run commands directly in chat.

## Ops to run

<!-- Agents add pending commands here. Ops runs them after approver sign-off. -->

_No pending ops._

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
```

---

## Completed ops

<!-- Move items here after ops runs them and verification passes -->

---

## PR approval queue

| PR | Title | Agent summary | Approver |
|----|-------|---------------|----------|
| — | — | — | pending |

---

## Notes

- Repo agent workflow: `docs/AGENT_WORKFLOW.md`
- PR summary template: `docs/PR_SUMMARY_TEMPLATE.md`
- Obsidian logging: `docs/OBSIDIAN_LOGGING.md`
