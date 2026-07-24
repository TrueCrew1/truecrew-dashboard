# AI OS — Approval Policy

Status: Draft  
Version: 0.1  
Last updated: 2026-07-24

Purpose
- Define approval levels, predicates, recording, retention, and emergency override processes for AI OS actions.

Scope
- Applies to actions that materially affect safety, privacy, infra, memory retention, routing behaviors, or external publication.

Approval levels
- Auto: no approval required (low-risk, read-only, non-PII actions).
- Reviewer approval: single designated reviewer (engineer or PM) for medium-risk changes.
- Multi-review approval: at least two reviewers from different domains (Engineering + T&S / Data Steward) for high-risk changes.
- Executive/T&S approval: explicit T&S + Exec signoff for critical-risk changes or policy bypasses.

Predicates that require approval
- Any write to production data stores containing PII → Multi-review + Data Steward approval.
- Any Memory Core schema change that alters retention or sensitivity classification for sensitive namespaces → T&S approval.
- Any Routing Table change that bypasses Safety hold predicates or materially alters precedence → T&S + Engineering approval.
- Any infra change that can cause downtime or security exposure → Infra lead approval + Ops.
- Any external publication of aggregated or research datasets → Legal + Privacy + Exec review.

Approval artifacts & recording
- Each approval artifact must include:
  - approver identity (SAML/GitHub/SSO)
  - UTC timestamp
  - approval artifact ID (ticket number or signed tag)
  - brief rationale
- Approval artifacts must be linked in the CR and logged in the audit store.

Process & merge gates
1. Create CR describing change, risk assessment, rollback plan, activation test, and required approver list.
2. Approvers review and approve, request changes, or deny.
3. CI/CD gate validates presence of required approval artifacts before allowing merge. (Documentation-only branches must still include approvals where predicates require.)
4. Post-merge audits compare approvals vs. deployed changes quarterly.

Auditing & retention
- Approval records retained for 2 years (or longer per compliance).
- Quarterly audits of approvals vs. changes.

Emergency overrides
- For declared emergencies (by Sev criteria), on-call exec + T&S can issue a time-limited override.
- Override must be logged with identity, justification, and must be ratified by full approval process post-factum.

Delegation & escalation
- Approvers may delegate in documented, time-limited manner.
- If approvers unavailable, follow the emergency contact ladder in Operating Plan.

Notes
- For v0.1, PRs for documentation-only changes should not be auto-merged; human review required.
