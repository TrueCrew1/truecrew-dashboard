# AI OS — Handoff Template

Use this verbatim template when transferring responsibility between agents, subsystems, or humans.

Title
- [Short descriptive title]

Context
- What led to this handoff? (one-paragraph summary)
- Request ID / Request URL / Incident ID:
- Timestamp (UTC):
- Origin center: Command Center | Build Center | Research | Memory Core

Current state
- Actions taken so far (commands run, artifacts created)
- Last agent/state (name, version, checkpoint)
- Relevant artifacts (logs, memory snapshots, run IDs)
- Key variables and values (sensitive items redacted or linked to vault)

Decision points & open tasks
- Pending approvals or reviews:
- Tasks to complete (actionable):
  - [ ] Task 1: suggested owner
  - [ ] Task 2: suggested owner
- Rollback plan (if applicable)

Routing & Escalation
- Current route and target (agent/pool/human)
- Escalation path (contacts + priority)
- Timeout and SLA expectations

Safety & Privacy
- Data sensitivity class:
- Any PII or restricted data in scope? (yes/no) — if yes list Data Steward contact
- Safety checks performed and outstanding

Acceptance criteria
- Measurable conditions defining success

Evidence & Artifacts
- Links to logs, trace IDs, memory entry IDs, approvals
- Activation test (if this handoff is part of a CR): path under docs/ai-os/activation-tests/

Notes & Additional Context
- Assumptions, known unknowns, and temporary workarounds

Sign-off
- From (name / role / timestamp)
- To (name / role / timestamp)
- Approval artifact IDs (if applicable)
