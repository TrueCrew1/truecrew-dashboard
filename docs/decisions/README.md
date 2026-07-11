# Architecture Decision Records

## What ADRs are

Architecture Decision Records (ADRs) are short, durable notes that capture an important
structural choice: the context, the decision, and the consequences. They are not tutorials
or runbooks.

## Why this repo uses them

True Crew is built with agents and human approvers in the loop. ADRs give everyone the same
*why* reference so new work does not re-litigate settled architecture — especially around
governance, data shape, and observability.

## Numbering convention

- Files: `ADR-NNN-short-slug.md` (three-digit sequence, kebab-case slug).
- Start at `001`; increment for each new decision.
- Status line in each ADR: `Proposed`, `Accepted`, `Deprecated`, or `Superseded`.
- When superseding, add a note in the old ADR pointing to the replacement.

## Index

| ADR | Status | Topic |
|---|---|---|
| [ADR-001 — Auditor system](ADR-001-auditor-system.md) | Accepted | Observability-only audit layer for approvals and system events |
| [ADR-002 — V1 auth trust boundary](ADR-002-auth-trust-boundary.md) | Accepted | Phased v1 auth: memberships authoritative; operational tables backend-only |
