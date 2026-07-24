---
title: "0000 — Initial Research Package (Blocked)"
status: "blocked"
project: "M&S Painting V2"
type: "research"
source: "M&S RESEARCH BLOCK.docx"
---

# Request Header

- Request: M&S Painting Platform V2 — First Initiative Batch
- Source document: M&S Painting Platform Improvement Plan (V2)
- Template: research_lane_standard_template.md
- Requested initiatives:
- Repair / reliability work
- Security and monitoring
- Branded documents and CRM basics
- Notifications leaving the app
- QuickBooks real integration
- V2 estimating engine
- Package status: Blocked — source inputs unavailable
- Blocking condition: Neither the M&S Painting V2 improvement plan nor the contents of research_lane_standard_template.md were included or made accessible in the request.
- No-guesswork rule: Product behavior, architecture, data models, integrations, legal language, workflows, defects, and acceptance criteria must not be invented.

# Executive Decision Block

## Decision

Do not authorize implementation from this package yet.

## Reason

The initiative names alone do not contain enough information to create builder-ready functional specifications, technical specifications, security requirements, legal notices, migration procedures, or test cases without making unsupported assumptions.

## Required Next Action

Provide the complete contents or an accessible repository path for:

- M&S Painting Platform Improvement Plan V2
- research_lane_standard_template.md
- Relevant current-state repository documentation, if it is not included in the V2 plan

## Exit Criteria

Research may proceed when:

- The complete V2 plan is available.
- The authoritative template is available.
- The current application stack and deployment environment can be identified.
- Existing QuickBooks, notification, document, CRM, estimating, security, and monitoring behavior can be inspected or documented.
- Unknown requirements can be recorded as explicit decisions rather than silently assumed.

# Problem and Outcome Definition

## Known Problem

M&S Painting requires a first V2 initiative batch covering reliability, security, monitoring, branded documents, CRM capabilities, external notifications, QuickBooks integration, and estimating.

## Unknowns Blocking Specification

- Current defects and their severity
- Existing platform behavior
- Target user roles
- Current workflows
- Current architecture and technology stack
- Current data model
- Existing integrations
- Required accounting workflows
- Estimating formulas and business rules
- Document types and branding rules
- Notification channels and consent requirements
- Deployment and operational constraints
- Jurisdictions governing legal notices
- Success metrics and release deadlines

## Intended Outcome

Produce a source-traceable implementation package in which every requirement:

- Is tied to the V2 plan or an approved decision.
- Has explicit acceptance criteria.
- Identifies edge cases and failure behavior.
- States security, privacy, and legal effects.
- Defines testable builder handoff tasks.
- Contains no silent assumptions.

# User and Workflow Analysis

## User Roles

The source materials must identify and define all roles. At minimum, the following possible roles require confirmation:

- Business owner
- Office administrator
- Estimator
- Project manager
- Field worker
- Customer
- Accounting user
- Platform administrator
- Support or operations user

These are candidate roles only and are not approved requirements.

## Required Workflow Inventory

The V2 plan must be used to document:

- Lead creation and qualification
- Customer and contact management
- Estimate creation, revision, approval, and conversion
- Branded document generation and delivery
- Job or project creation
- Notification creation, consent, delivery, and failure handling
- Invoice or accounting synchronization
- Payment and reconciliation behavior
- User access and administrative actions
- Error reporting and operational recovery

## Workflow Documentation Standard

Each confirmed workflow must include:

- Trigger
- Authorized actor
- Preconditions
- Ordered steps
- Data read
- Data written
- External systems called
- Notifications generated
- Expected completion state
- Failure states
- Retry behavior
- Cancellation behavior
- Audit events
- Acceptance criteria

# Functional Specification

## Repair / Reliability Work

### Required Source Inputs

- V2 defect inventory
- Current issue tracker
- Error logs
- Failed workflows
- Reproduction steps
- Severity and frequency data
- Existing automated test coverage

### Specification Status

Blocked pending defect-level source information.

### Required Acceptance-Criteria Format

Each repair must define:

Given a documented starting state
When the user or system performs the affected action
Then the expected result occurs
And no duplicate or partial record is created
And any failure is visible and recoverable

### Required Edge Cases

- Repeated submission
- Browser refresh during mutation
- Network interruption
- External dependency timeout
- Concurrent edits
- Stale client state
- Partial database write
- Duplicate webhook delivery
- Unauthorized access
- Invalid or missing input
- Empty result sets
- Large records or attachments

## Security and Monitoring

### Required Capabilities

The V2 plan and current implementation must be inspected to determine requirements for:

- Authentication
- Session management
- Authorization
- Role-based access
- Secret management
- Encryption
- Input validation
- Rate limiting
- Audit logging
- Security-event monitoring
- Application-error monitoring
- Health checks
- Alert delivery
- Backup monitoring
- Dependency vulnerability scanning

### Specification Status

Blocked pending architecture, hosting, identity-provider, and data-classification details.

## Branded Documents and CRM Basics

### Required Decisions

- Supported document types
- Required brand assets
- Editable versus fixed content
- Document numbering
- Revision behavior
- PDF generation method
- Storage and retention
- Customer delivery workflow
- Customer and contact fields
- Lead and customer lifecycle stages
- Activity history requirements
- Search and deduplication behavior
- Ownership and permissions

### Specification Status

Blocked pending the V2 plan, brand assets, document examples, and CRM workflow definitions.

## Notifications Leaving the App

### Required Decisions

- Supported channels
- Triggering events
- Recipient rules
- Message templates
- Consent requirements
- Opt-out behavior
- Delivery provider
- Retry policy
- Delivery-status tracking
- Bounce or failure handling
- Rate limits
- Quiet hours
- Audit requirements

### Specification Status

Blocked pending channel, provider, consent, and jurisdiction requirements.

## QuickBooks Real Integration

### Required Decisions

- QuickBooks product and region
- OAuth application ownership
- Supported company-file configuration
- Source of truth for each entity
- Customer synchronization
- Product or service synchronization
- Estimate synchronization
- Invoice synchronization
- Payment synchronization
- Tax-code handling
- Account mapping
- Duplicate detection
- Conflict resolution
- Webhook processing
- Reauthorization behavior
- Historical import scope
- Reconciliation workflow

### Specification Status

Blocked pending the V2 plan and approved accounting workflow.

## V2 Estimating Engine

### Required Decisions

- Estimate input model
- Measurement units
- Labor calculations
- Material calculations
- Production rates
- Waste factors
- Markup and margin rules
- Minimum charges
- Tax rules
- Discounts
- Optional line items
- Rounding behavior
- Versioning
- Approval workflow
- Estimate expiration
- Revision history
- Conversion to job and invoice
- Override permissions
- Calculation traceability

### Specification Status

Blocked pending approved formulas, sample estimates, and business rules.

# Technical Specification

## Current-State Discovery Required

Builders must not select an architecture until the following are identified:

- Frontend framework
- Backend framework
- Runtime versions
- Database engine and schema
- Authentication provider
- Hosting platform
- Deployment pipeline
- Background-job mechanism
- File-storage service
- Email or messaging providers
- Existing QuickBooks code
- Logging and monitoring services
- Test frameworks
- Environment configuration
- Secret-storage mechanism

## Required Technical Deliverables

After source access, the package must include:

- Component-level architecture
- Data-flow diagrams
- Entity and relationship changes
- API contracts
- Background-job contracts
- Webhook contracts
- Idempotency strategy
- Error taxonomy
- Retry and dead-letter behavior
- Database migrations
- Rollback procedures
- Feature-flag strategy
- Observability requirements
- Deployment sequence
- Backward-compatibility requirements

## Technical Acceptance Gate

No implementation task is ready until it identifies:

- Files or components affected
- Inputs and outputs
- Data mutations
- API behavior
- Permission checks
- Error behavior
- Tests required
- Migration impact
- Rollback method
- Dependencies

# Security Specification

## Required Threat Review

Each initiative must be reviewed for:

- Broken access control
- Privilege escalation
- Insecure direct object references
- Injection
- Cross-site scripting
- Cross-site request forgery
- Server-side request forgery
- Authentication bypass
- Session fixation or theft
- Secret exposure
- Sensitive-data leakage
- Unsafe file generation or upload
- Webhook forgery
- Replay attacks
- Dependency vulnerabilities
- Insufficient auditability

## Mandatory Security Requirements

These requirements must be confirmed against the current stack before implementation:

- Enforce authorization server-side for every protected operation.
- Deny access by default.
- Do not place secrets in source control or client-delivered code.
- Validate external webhook signatures when supported.
- Make webhook and retry processing idempotent.
- Record security-relevant administrative actions.
- Avoid logging credentials, tokens, financial details, or unnecessary personal data.
- Encrypt transport using supported TLS.
- Rotate or revoke integration credentials when access changes.
- Return non-sensitive errors to users while retaining actionable server-side diagnostics.

## Security Blockers

- Data classification is unknown.
- Identity architecture is unknown.
- Current authorization rules are unknown.
- Hosting and secret-management systems are unknown.
- Applicable security obligations are unknown.

# Legal and Notification Specification

## Legal Review Boundary

No legal notice, consent language, privacy disclosure, contract language, or regulatory claim may be treated as approved without review by qualified counsel.

## Required Notice Inventory

The source package must identify whether the platform needs:

- Terms of service
- Privacy notice
- Cookie notice
- Electronic-communications consent
- Email unsubscribe language
- SMS consent and opt-out language
- Estimate terms
- Change-order terms
- Payment terms
- Tax disclosures
- Warranty language
- Document-retention notices
- Third-party integration disclosures
- QuickBooks data-use disclosures

## Notification Requirements to Resolve

- Jurisdictions served
- Whether SMS is in scope
- Consent capture method
- Consent evidence retained
- Permitted message categories
- Opt-out keywords and processing
- Transactional versus marketing classification
- Sender identification
- Quiet-hour requirements
- Retention period
- Provider-specific requirements

## Acceptance Gate

A notification flow is not release-ready until:

- Its legal classification is documented.
- Its recipient-selection rule is testable.
- Required consent is checked before dispatch.
- Opt-outs are enforced.
- Delivery attempts and outcomes are auditable.
- Sensitive information is excluded unless explicitly approved.
- Final notice language has an identified approver.

# Reliability and Operations Specification

## Required Reliability Controls

- Structured error reporting
- Correlation identifiers
- Health checks
- Dependency health visibility
- Retry limits
- Exponential backoff where appropriate
- Idempotency for repeatable operations
- Dead-letter or failed-job visibility
- Timeout handling
- Alert ownership
- Runbooks
- Backup verification
- Restore testing
- Deployment rollback
- Feature flags for risky changes

## Required Service Objectives

The V2 plan must define or authorize:

- Availability target
- Maximum acceptable error rate
- Recovery-time objective
- Recovery-point objective
- Alert thresholds
- Incident response owner
- Support hours
- Log-retention period

## Operational Acceptance Gate

Every production-facing capability must have:

- A health signal
- A failure signal
- An assigned alert owner
- A documented recovery action
- A safe retry or rollback path
- A method for confirming successful recovery

# Competitive Landscape

## Research Status

Blocked pending confirmation of:

- Target market
- Service area
- Customer segment
- Current product positioning
- Required competitor categories
- Geographic pricing relevance
- Approved research date range

## Required Competitor Categories

Once confirmed, research should cover:

- Painting contractor CRM platforms
- Field-service management platforms
- Estimating platforms
- Contractor proposal and document tools
- Accounting-integrated contractor platforms
- Direct local or regional competitors, if applicable

## Required Comparison Fields

For each approved competitor:

- Product and company
- Target customer
- Core features
- Estimating capabilities
- CRM capabilities
- Document generation
- Notification capabilities
- QuickBooks integration
- Security or compliance claims
- Pricing and pricing date
- Trial or onboarding model
- Review volume and rating
- Recurring strengths in reviews
- Recurring weaknesses in reviews
- Source URLs
- Access date
- Confidence level

## Evidence Standard

- Material claims require a cited source.
- Pricing must include currency, billing period, tier, and access date.
- Review findings must distinguish individual anecdotes from recurring themes.
- Missing information must be marked Not publicly verified.
- Marketing claims must not be presented as independently validated facts.

# Competitive Opportunity Analysis

## Analysis Status

Blocked until the competitive landscape and V2 product requirements are available.

## Required Opportunity Tests

Each proposed differentiator must answer:

- Which confirmed user problem does it solve?
- Which competitors address the same problem?
- What evidence shows an unmet need?
- Is the capability table stakes or differentiating?
- What implementation cost does it introduce?
- What operational burden does it create?
- What security or legal risk does it add?
- How will adoption or value be measured?

## Required Output

The completed package must classify opportunities as:

- Required parity
- Near-term differentiator
- Later differentiator
- Unsupported by evidence
- Out of scope

# Cost and Demand Analysis

## Cost Inputs Required

- Engineering capacity
- Hosting costs
- Monitoring costs
- Notification-provider pricing
- Document-generation costs
- File-storage costs
- QuickBooks API or partner costs
- Support burden
- Legal-review costs
- Security-review costs
- Migration effort
- Ongoing maintenance effort

## Demand Inputs Required

- Founder priority
- User interviews
- Support requests
- Defect frequency
- Workflow abandonment
- Estimate volume
- Document volume
- Notification volume
- QuickBooks usage
- Lost-sale evidence
- Competitor review themes
- Willingness-to-pay evidence

## Analysis Status

No cost or demand conclusion can be made from the supplied initiative names alone.

## Required Scoring Method

The final method must be approved before use and must define:

- Demand score
- User-impact score
- Revenue impact
- Reliability impact
- Security urgency
- Legal urgency
- Engineering effort
- Operational cost
- Dependency risk
- Confidence level

# Prioritization and Sequencing

## Provisional Dependency Order

The following is a discovery sequence, not an approved implementation sequence:

- Acquire and validate source documents.
- Inventory current defects, architecture, workflows, and integrations.
- Classify security and reliability risks.
- Resolve shared identity, permission, data-model, and observability requirements.
- Specify each initiative with source-traceable acceptance criteria.
- Identify dependencies and migration requirements.
- Complete legal and security review.
- Prioritize using approved impact, urgency, effort, and confidence criteria.
- Produce builder tasks and release gates.

## Sequencing Constraints to Validate

- Reliability repairs may be prerequisites for all later work.
- Authorization and audit requirements may affect every initiative.
- CRM entities may be prerequisites for documents and notifications.
- Estimate entities may be prerequisites for QuickBooks synchronization.
- Notification consent may be required before external messaging.
- QuickBooks entity mapping must be approved before synchronization.
- Monitoring must exist before high-risk integrations are released.

These are candidate dependencies and require confirmation from the source plan and repository.

# Risk Register

| Risk | Current likelihood | Impact | Mitigation | Release gate |
| --- | --- | --- | --- | --- |
| Builders implement unsupported assumptions | High | High | Require source traceability and explicit decision records | No unresolved requirement may be silently assumed |
| Existing behavior is broken by V2 changes | Unknown | High | Inventory current behavior and add regression tests | Regression suite passes |
| Authorization gaps expose customer or financial data | Unknown | Critical | Perform permission and threat review | Security tests pass |
| Duplicate QuickBooks records are created | Unknown | High | Define identity mapping, idempotency, and reconciliation | Duplicate-delivery tests pass |
| Notification consent is not enforced | Unknown | High | Define consent and suppression rules with legal review | Consent and opt-out tests pass |
| Estimate calculations are incorrect | Unknown | Critical | Obtain approved formulas and golden test cases | Golden calculations match exactly |
| Documents contain incorrect legal language | Unknown | High | Require approved notice versions and counsel review | Legal approval recorded |
| Failures are invisible to operations | Unknown | High | Define logs, metrics, alerts, and runbooks | Failure alerts are demonstrated |
| Partial migrations corrupt records | Unknown | High | Define reversible migrations and backups | Restore and rollback tested |
| Competitor claims are stale or unsupported | Medium | Medium | Cite sources and access dates | Evidence review passes |
| Scope expands across all six initiatives | High | High | Split work into dependency-ordered slices | Each slice has a bounded artifact |
| Source documents remain unavailable | High | Critical | Obtain authoritative files before specification | Source-access gate passes |

# QA and Verification Pack

## Package-Level Verification

The completed implementation package must pass all of the following checks:

- Every exact template heading is present.
- Every initiative has functional requirements.
- Every requirement has a source reference or approved decision.
- Every mutation has authorization requirements.
- Every external operation has timeout, retry, and idempotency behavior.
- Every failure state has expected user and operational behavior.
- Every legal notice has an approval owner.
- Every estimate formula has golden test cases.
- Every QuickBooks mapping has synchronization and conflict tests.
- Every notification has consent, suppression, delivery, and failure tests.
- Every builder task identifies dependencies and verification steps.
- No unresolved assumption is represented as a confirmed fact.

## Minimum Test Categories

### Repair / Reliability

- Defect reproduction
- Regression
- Concurrent action
- Duplicate submission
- Partial failure
- Recovery
- Rollback

### Security and Monitoring

- Authentication
- Authorization
- Role isolation
- Input validation
- Secret handling
- Audit generation
- Alert triggering
- Sensitive-log inspection

### Branded Documents and CRM

- Required-field validation
- Duplicate-contact handling
- Permission enforcement
- Brand rendering
- Revision handling
- PDF consistency
- Storage and retrieval
- Delivery tracking

### External Notifications

- Recipient selection
- Consent enforcement
- Opt-out enforcement
- Template rendering
- Provider timeout
- Retry limits
- Duplicate suppression
- Bounce or delivery failure
- Audit history

### QuickBooks Integration

- OAuth connection
- Token refresh
- Revocation
- Entity mapping
- Create and update
- Duplicate webhook
- Out-of-order webhook
- Rate limiting
- Conflict resolution
- Reconciliation
- Reauthorization

### V2 Estimating Engine

- Golden calculations
- Unit conversion
- Rounding
- Minimum charges
- Markups and margins
- Taxes
- Discounts
- Optional items
- Overrides
- Revision history
- Invalid inputs
- Boundary values
- Conversion to downstream records

## Current Verification Result

Failed — blocked by missing source artifacts.

# Builder Handoff Pack

## Current Handoff Decision

Not ready for implementation.

## First Executable Task

### Title

Acquire and validate the authoritative M&S Painting V2 source package.

### Inputs Required

- Complete M&S Painting Platform Improvement Plan V2
- Complete research_lane_standard_template.md
- Repository or architecture documentation
- Existing issue or defect inventory
- Current data model
- Current integration inventory
- Existing estimate examples and formulas
- Existing branded document examples
- Existing legal or notification language
- Approved competitor scope

### Steps

- Add the authoritative files to an accessible workspace.
- Record each file's path, version, owner, and modification date.
- Confirm that the V2 plan covers all six requested initiatives.
- Identify missing source inputs.
- Create an assumption and decision log.
- Assign each unresolved decision to an owner.
- Re-run the Research lane against the verified source package.

### Expected Artifact

An indexed, versioned source manifest containing the V2 plan, standard template, repository references, current-state evidence, and a list of unresolved decisions.

### Acceptance Criteria

- The full V2 plan is accessible.
- The authoritative template is accessible.
- Each source has a version or retrieval date.
- All six initiatives are represented or explicitly marked absent.
- Missing information is recorded as an open decision.
- No product or technical requirement is inferred solely from an initiative title.
- The source package is sufficient to produce traceable specifications and tests.

### Verification Command

A reviewer can open every referenced source, locate each of the six initiatives, and trace every subsequent requirement to either source text or an approved decision record.

### Approval Required

No approval is required to acquire and index the source materials. Human approval is required before adopting legal language, changing security policy, selecting accounting behavior, or authorizing irreversible production changes.
