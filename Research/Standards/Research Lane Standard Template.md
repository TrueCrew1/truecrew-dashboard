---
title: "Research Lane Standard Template"
status: "template"
type: "research-standard"
scope: "global"
owner: "Research Center"
tags:
  - standards
  - template
  - research
---

# Research Lane Standard Template

## Purpose

This template defines the minimum structure, evidence, and handoff requirements for a research package to be considered **builder-ready**.

A builder-ready research package gives Build, Command, Legal, Security, and other receiving centers enough verified information to act without silently inventing requirements.

Every required section must be:

- Completed with source-traceable content;
- Marked **Not applicable**, with a short reason; or
- Marked **Open questions**, with the missing information and decision owner identified when known.

A section is not complete when uncertainty is hidden, unsupported assumptions are presented as facts, or important decisions are deferred without being recorded.

## How to Use This Template

1. Copy this structure into a new project-specific research file.
2. Replace template instructions with information from source documents, verified research, and recorded decisions.
3. Cite or link the evidence supporting material claims.
4. Distinguish confirmed facts, decisions, assumptions, and open questions.
5. Mark non-applicable sections explicitly rather than deleting them.
6. Do not invent product behavior, business rules, architecture, legal language, security policy, pricing, or market evidence.
7. Assign unresolved questions to a decision owner when one is known.
8. Complete the QA and handoff sections before declaring the package builder-ready.

Use these labels consistently:

- **Confirmed:** Directly supported by an authoritative source.
- **Decision:** Explicitly approved by an authorized decision-maker.
- **Assumption:** A provisional statement requiring validation.
- **Open question:** Information or a decision still required.
- **Not applicable:** The section does not apply, with the reason stated.
- **Blocked:** Work cannot safely continue until a named dependency is resolved.

## Sections Overview

Every research package must contain these sections:

1. Request Header
2. Executive Decision Block
3. Problem and Outcome Definition
4. User and Workflow Analysis
5. Functional Specification
6. Technical Specification
7. Security Specification
8. Legal and Notification Specification
9. Reliability and Operations Specification
10. Competitive Landscape
11. Competitive Opportunity Analysis
12. Cost and Demand Analysis
13. Prioritization and Sequencing
14. Risk Register
15. QA and Verification Pack
16. Builder Handoff Pack

## Request Header

Record the identity, ownership, scope, and routing context of the research package.

Header values should come from the routed request, project records, or an explicit project decision. Missing identifiers, owners, dates, or source documents must be marked as open questions.

Include:

- `request_id`
- Request date
- Research completion or last-updated date
- Status
- Priority, if assigned
- Request owner
- Research owner
- Project
- Initiative
- Requested outcome
- Work type
- Owning center
- Receiving centers
- Approval requirements
- Target milestone or deadline, if confirmed
- In-scope items
- Out-of-scope items
- Source documents
- Related requests
- Related decisions
- Repository or workspace links
- Revision history

## Executive Decision Block

Give decision-makers a concise view of what the research supports, what remains unresolved, and what action is recommended.

Recommendations must be connected to evidence in the package. Research must not present an unapproved recommendation as a final decision.

Include:

- Decision required
- Recommended action
- Recommendation status:
  - Proposed
  - Approved
  - Rejected
  - Deferred
  - Blocked
- Decision owner
- Required approvers
- Decision deadline, if confirmed
- Evidence summary
- Alternatives considered
- Expected value
- Major trade-offs
- Key dependencies
- Blocking issues
- Confidence level and basis
- Consequence of taking no action
- Open questions requiring a decision

## Problem and Outcome Definition

Define the current problem, the intended outcome, and the boundaries of the work.

Problem statements should be supported by source documents, observed behavior, user evidence, operational data, or an explicit stakeholder decision. If the current state has not been verified, mark it as an assumption or open question.

Include:

- Current problem description
- Affected users or systems
- Current-state evidence
- Root cause, if verified
- Symptoms versus confirmed causes
- Business impact
- User impact
- Operational impact
- Intended outcome
- Success criteria
- Measurable outcome indicators
- Constraints
- Dependencies
- In scope
- Out of scope
- Non-goals
- Known assumptions
- Open questions

## User and Workflow Analysis

Describe the people, roles, systems, and workflows affected by the proposed work.

User roles and workflow steps must be based on source material, observation, interviews, existing system behavior, or approved decisions. Candidate roles and unverified workflows must be labeled accordingly.

Include:

- User groups
- User roles
- Role definitions
- Permissions relevant to each role
- User needs
- User pain points
- Current workflows
- Target workflows
- Workflow triggers
- Preconditions
- Normal workflow steps
- Alternative paths
- Failure paths
- Cancellation paths
- Recovery paths
- Data created, read, updated, or deleted
- External systems involved
- Notifications generated
- Workflow completion state
- Accessibility considerations
- Frequency and volume, if known
- Workflow diagrams or links
- Open questions

For each material workflow, identify:

- Actor
- Trigger
- Preconditions
- Ordered steps
- Inputs
- Outputs
- State changes
- Authorization checks
- Failure behavior
- Recovery behavior
- Audit requirements
- Acceptance criteria

## Functional Specification

Define the required system behavior in testable terms.

Functional requirements must be traceable to a source, decision, user need, or verified workflow. Do not fill gaps with presumed product behavior.

Include:

- Functional requirement identifier
- Requirement statement
- Source or decision reference
- User role
- Trigger
- Preconditions
- Inputs
- Validation rules
- Expected behavior
- Outputs
- State changes
- Error behavior
- Alternate flows
- Edge cases
- Permission requirements
- Audit events
- Acceptance criteria
- Dependencies
- Priority
- Open questions

Acceptance criteria should be:

- Specific;
- Observable;
- Testable;
- Bounded to the requirement; and
- Clear about success and failure behavior.

Where useful, use a structured form such as:

- **Given:** Confirmed starting state
- **When:** Action or event
- **Then:** Expected result
- **And:** Additional testable conditions

At minimum, consider these edge-case categories:

- Missing input
- Invalid input
- Duplicate submission
- Concurrent action
- Stale data
- Network interruption
- External dependency failure
- Partial completion
- Unauthorized action
- Empty state
- Boundary values
- Large inputs
- Retry after failure
- Cancellation
- Reversal or rollback

## Technical Specification

Describe the confirmed technical context, constraints, interfaces, and implementation requirements.

Technical statements must come from repository inspection, architecture records, system documentation, observed behavior, or explicit technical decisions. Proposed architecture must be labeled as proposed until approved.

Include:

- Current architecture
- Relevant components
- Runtime and framework versions
- Hosting and deployment environment
- Data stores
- Current data model
- Proposed data-model changes
- APIs
- Events
- Webhooks
- Background jobs
- File or object storage
- External services
- Authentication mechanism
- Authorization mechanism
- Secret-management mechanism
- Environment configuration
- Integration contracts
- Input and output schemas
- Idempotency requirements
- Timeout behavior
- Retry behavior
- Error taxonomy
- Data migration requirements
- Backward-compatibility requirements
- Feature flags
- Deployment sequence
- Rollback plan
- Technical dependencies
- Technical constraints
- Performance requirements
- Observability requirements
- Architecture decisions required
- Open questions

For each proposed technical change, identify:

- Affected component
- Confirmed current behavior
- Required target behavior
- Interfaces affected
- Data affected
- Dependencies
- Failure modes
- Migration impact
- Verification method
- Rollback method

## Security Specification

Identify security requirements, affected trust boundaries, threats, and verification obligations.

Security policy must come from approved organizational standards, applicable requirements, threat analysis, or an authorized security decision. Do not claim compliance, certification, or approval without evidence.

Include:

- Data classification
- Sensitive data involved
- Trust boundaries
- Authentication requirements
- Authorization requirements
- Role and permission model
- Least-privilege requirements
- Session requirements
- Input-validation requirements
- Encryption requirements
- Secret-management requirements
- Audit requirements
- Security logging requirements
- Retention requirements
- Rate-limit requirements
- Abuse and misuse cases
- External integration risks
- Webhook verification
- Replay protection
- File handling risks
- Dependency risks
- Administrative controls
- Incident-response implications
- Security testing requirements
- Required security review
- Security approver
- Open questions

At minimum, evaluate applicability of:

- Broken access control
- Privilege escalation
- Insecure direct object references
- Injection
- Cross-site scripting
- Cross-site request forgery
- Server-side request forgery
- Authentication bypass
- Session theft
- Secret exposure
- Sensitive-data leakage
- Unsafe file handling
- Webhook forgery
- Replay attacks
- Denial of service
- Dependency vulnerabilities
- Insufficient logging or auditability

If an item is not applicable, record why.

## Legal and Notification Specification

Document legal, privacy, consent, notice, communication, retention, and approval requirements relevant to the work.

This section defines issues and evidence requirements; it must not invent legal language or substitute for qualified legal review. Any legal text must be labeled as draft or approved, with its source and approver recorded.

Include:

- Applicable jurisdictions, if confirmed
- Legal owner or reviewer
- Required legal review
- Privacy implications
- Personal-data use
- Data collection purpose
- Data sharing
- Data retention
- Data deletion
- Terms or contract implications
- Required notices
- Required disclosures
- Consent requirements
- Consent evidence
- Withdrawal or opt-out behavior
- Communication channels
- Transactional versus marketing classification
- Recipient-selection rules
- Sender identification
- Quiet-hour requirements, if applicable
- Template ownership
- Template versioning
- Delivery evidence
- Failure and bounce handling
- Third-party provider obligations
- Accessibility requirements
- Record-keeping requirements
- Approval status
- Open questions

For each notification type, identify:

- Trigger
- Recipient
- Channel
- Purpose
- Required consent
- Suppression rules
- Approved content source
- Delivery provider
- Delivery-state tracking
- Retry behavior
- Failure behavior
- Opt-out behavior
- Audit record
- Retention requirement
- Legal approval status

## Reliability and Operations Specification

Define how the capability will be operated, monitored, recovered, and supported.

Reliability targets must come from approved service objectives, observed usage, operational requirements, or explicit decisions. Do not invent availability or recovery targets.

Include:

- Availability requirement
- Performance targets
- Capacity expectations
- Expected usage volume
- Timeout policy
- Retry policy
- Idempotency requirements
- Failure isolation
- Degraded-mode behavior
- Health checks
- Logs
- Metrics
- Traces
- Dashboards
- Alerts
- Alert thresholds
- Alert owner
- Escalation path
- Runbooks
- Backup requirements
- Restore requirements
- Recovery-time objective, if approved
- Recovery-point objective, if approved
- Data reconciliation
- Failed-job handling
- Dead-letter handling
- Maintenance procedures
- Deployment monitoring
- Rollback procedures
- Support ownership
- Incident-response requirements
- Operational documentation
- Open questions

For each critical dependency, record:

- Dependency owner
- Expected behavior
- Failure signal
- Timeout
- Retry limit
- Fallback behavior
- Recovery procedure
- Verification method

## Competitive Landscape

Describe relevant alternatives, competitors, substitutes, and market patterns.

Material claims must cite current, reviewable evidence. Pricing, plan features, ratings, and review counts must include a source and retrieval date. If current evidence cannot be obtained, mark the item as unverified.

Include:

- Research date
- Market definition
- Target customer segments
- Competitor-selection criteria
- Direct competitors
- Indirect competitors
- Substitute workflows
- Competitor category
- Target customer
- Core workflows
- Key features
- Integrations
- Pricing model
- Public pricing, when verified
- Additional or hidden costs
- Strengths
- Weaknesses
- Positive review themes
- Negative review themes
- Review volume and rating, when verified
- Demand indicators
- Source links
- Retrieval dates
- Evidence confidence
- Information not publicly verified
- Open questions

Distinguish between:

- Vendor claims;
- Independent review findings;
- Individual customer anecdotes;
- Recurring review themes; and
- Researcher interpretation.

## Competitive Opportunity Analysis

Translate competitive evidence into supported opportunities, trade-offs, and positioning options.

An opportunity must connect a verified user need or business outcome to evidence of a market gap. A feature being absent from one competitor is not, by itself, proof of demand.

Include:

- Table-stakes capabilities
- Commonly praised capabilities
- Recurring complaints
- Premium capabilities
- Capabilities associated with higher pricing
- Market gaps
- Underserved user groups
- Workflow gaps
- Reliability gaps
- Integration gaps
- Usability gaps
- Trust or transparency gaps
- Potential differentiators
- Required parity features
- Opportunities to defer
- Evidence supporting each opportunity
- Expected user value
- Expected business value
- Implementation implications
- Operational implications
- Security and legal implications
- Confidence level
- Validation required
- Open questions

For each proposed opportunity, answer:

1. Which verified problem does it address?
2. Who experiences the problem?
3. What evidence shows demand?
4. How do existing alternatives address it?
5. Is it required parity or a differentiator?
6. What new cost, complexity, or risk would it introduce?
7. How would value be measured?
8. What remains unverified?

## Cost and Demand Analysis

Document available evidence about implementation cost, operating cost, demand, adoption, and commercial value.

Cost estimates must state their source, method, assumptions, date, and confidence. Demand claims must be supported by user evidence, usage data, market evidence, or an explicit business decision.

Include:

- Cost-estimation date
- Estimation method
- One-time implementation costs
- Migration costs
- Integration costs
- Infrastructure costs
- Third-party service costs
- Communication costs
- Storage costs
- Monitoring costs
- Security costs
- Legal-review costs
- Support costs
- Maintenance costs
- Training costs
- Opportunity cost
- Cost assumptions
- Confidence range
- Demand evidence
- User requests
- Usage data
- Support data
- Sales evidence
- Review evidence
- Market evidence
- Willingness-to-pay evidence
- Adoption barriers
- Switching costs
- Expected value
- Value measurement
- Pricing evidence, if applicable
- Open questions

Do not present an exact estimate when available evidence supports only a range or qualitative assessment.

## Prioritization and Sequencing

Recommend an evidence-based order of work, including prerequisites, dependencies, and release gates.

Priority labels must use an approved prioritization method or clearly state that the ordering is proposed. Urgency must not be confused with importance, and feature work must not silently override unresolved security, legal, or reliability blockers.

Include:

- Prioritization method
- Priority definitions
- Proposed priority
- Reason for priority
- User impact
- Business impact
- Security urgency
- Legal urgency
- Reliability urgency
- Estimated effort
- Confidence
- Dependencies
- Prerequisites
- Parallel work opportunities
- Blocking decisions
- Release gates
- Recommended sequence
- Deferred items
- Deferral rationale
- Reassessment triggers
- Decision owner
- Approval status
- Open questions

For each sequence item, record:

- Outcome
- Scope
- Dependencies
- Entry criteria
- Exit criteria
- Verification method
- Receiving owner
- Approval requirement

## Risk Register

Record material risks, uncertainty, consequences, mitigations, and ownership.

Risk ratings must use an approved method when one exists. If likelihood or impact cannot be established, mark it unknown rather than assigning an unsupported score.

Include:

- Risk identifier
- Risk description
- Category
- Cause
- Potential consequence
- Affected users or systems
- Likelihood
- Impact
- Overall rating
- Evidence
- Existing controls
- Proposed mitigation
- Contingency
- Risk owner
- Due date, if assigned
- Trigger or warning signal
- Residual risk
- Approval or acceptance status
- Open questions

At minimum, consider:

- Product risk
- User risk
- Technical risk
- Security risk
- Privacy risk
- Legal risk
- Reliability risk
- Operational risk
- Integration risk
- Data risk
- Migration risk
- Vendor risk
- Cost risk
- Schedule risk
- Adoption risk
- Evidence-quality risk

## QA and Verification Pack

Define how requirements, implementation, integrations, security controls, and operational behavior will be verified.

Tests must trace back to requirements, risks, or acceptance criteria. The package must distinguish required verification from optional test ideas.

Include:

- QA owner
- Test environments
- Test-data requirements
- Requirement-to-test traceability
- Acceptance-test cases
- Unit-test requirements
- Integration-test requirements
- End-to-end test requirements
- Regression-test requirements
- Security-test requirements
- Accessibility-test requirements
- Performance-test requirements
- Reliability and recovery tests
- Migration tests
- Rollback tests
- Data-integrity tests
- Permission tests
- Audit-log tests
- External dependency failure tests
- Monitoring and alert tests
- Legal or notice verification
- Manual review requirements
- Evidence to retain
- Pass criteria
- Failure criteria
- Release blockers
- Required approvers
- Open questions

Each test case should identify:

- Test identifier
- Requirement or risk reference
- Preconditions
- Test data
- Steps
- Expected result
- Evidence produced
- Pass or fail rule
- Responsible owner

The completed package should verify that:

- Every material requirement has acceptance criteria.
- Every critical risk has a control or explicit acceptance decision.
- Every permission-sensitive action has authorization tests.
- Every external integration has success, failure, timeout, retry, and duplicate-delivery tests where applicable.
- Every migration has integrity and rollback tests.
- Every operational alert can be triggered and observed.
- Every unresolved release blocker is visible.

## Builder Handoff Pack

Convert the approved research into bounded, executable work for the receiving center.

A handoff is builder-ready only when the builder can identify what to change, why it is needed, how success will be verified, and what must not be assumed.

Include:

- Handoff status:
  - Ready
  - Ready with conditions
  - Blocked
  - Not ready
- Receiving center
- Implementation owner
- Approved scope
- Explicit non-scope
- Source links
- Decision links
- Requirement identifiers
- Proposed work slices
- Recommended first slice
- Dependencies
- Required inputs
- Affected components, if confirmed
- Data changes, if confirmed
- Interface changes, if confirmed
- Migration requirements
- Security requirements
- Legal requirements
- Operational requirements
- Acceptance criteria
- Required tests
- Verification commands or procedures
- Rollback expectations
- Release gates
- Approval requirements
- Open questions
- Blockers

Each implementation slice should contain:

- Slice identifier
- Objective
- Source requirement
- Smallest executable scope
- Expected artifact
- Preconditions
- Dependencies
- Constraints
- Acceptance criteria
- Edge cases
- Security and legal impacts
- QA requirements
- Verification method
- Rollback method
- Approval requirement
- Receiving owner

A package must not be marked **Ready** when:

- Required source documents are missing.
- Material requirements are unsupported.
- Critical behavior depends on hidden assumptions.
- Blocking security or legal questions are unresolved.
- Acceptance criteria are absent.
- Required migrations lack verification and rollback plans.
- External integrations lack ownership and failure behavior.
- The receiving center cannot determine the first executable slice.
