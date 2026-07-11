# ADR-002: V1 Auth Trust Boundary

- Status: Accepted
- Date: 2026-07-07

## Context

True Crew is transitioning from a single-tenant, service-role-centric command-center architecture toward a multi-tenant field-operations SaaS model. The current system has minimal end-user authentication and no tenant-aware row-level security; most data access is mediated through backend/service-role patterns. The existing schema centers on tasks, workflows, tools, incidents, customers, and Chief approval flows.

The next phase introduces organizations, memberships, sites, crews, assets, work orders, inspections, downtime events, and other tenant-scoped operational records. Because the application is actively transitioning, the initial v1 authentication and authorization design must minimize risk, prevent cross-tenant data leaks, and keep implementation complexity manageable for a solo founder.

## Decision

We adopt a phased authorization model for v1, with a deliberately constrained direct-client trust boundary.

### V1 Direct-Client Trust Boundary

Only the minimum identity and access-context tables required to establish user sessions and collaboration awareness:

- organizations
- profiles
- memberships

**Memberships is the canonical source of truth for authorization.** All role, organization scope, and access decisions must be derived from live membership records, never from JWT claims alone.

### JWT as Cache, Not Authority

JWT claims may carry minimal hints (current organization, cached role) for performance and UX convenience. Claims must never be treated as authoritative. Membership queries remain the enforcement layer.

### Operational Tables Stay Backend-Only

All business and operational data tables remain outside v1 RLS and are backend-mediated at launch:

- crews
- projects
- jobs
- work_orders
- shifts
- tasks
- communications
- documents
- assets
- inventory
- payments
- reporting
- analytics
- audit workflows
- any future operational business tables

Direct client access is restricted to identity, organization, and membership data needed to establish user context and basic collaboration awareness. All operational business data, workflow execution, authorization decisions, and state-changing actions are exclusively mediated by the trusted backend service.

### Future RLS Promotion

Tables may move inside the RLS boundary only when ALL of the following conditions are met:

- authorization rules are fully documented and reviewed
- tenant ownership is explicit and enforceable in schema design
- backend validation logic has been identified and replicated in policy definition
- query performance has been tested under realistic production load
- security review confirms no cross-tenant exposure paths exist

## Consequences

### Positive

- Minimizes the initial RLS surface area and reduces the blast radius of policy mistakes
- Creates a clear semantic boundary between identity/access context and operational business logic
- Allows additive migration from the current legacy/service-role model without wholesale schema rewrites
- Keeps backend-only workflows stable and predictable while authentication is introduced gradually
- Lowers the risk of cross-tenant data exposure during the transition

### Negative

- The system operates with a split trust model during v1; not all data access follows a unified RLS pattern
- User-facing operational data still requires backend mediation even after login exists
- Future migration work is required to bring selected operational tables under RLS governance
- Authorization logic is partially duplicated between backend application code and database policies during transition
- Initial feature velocity may be slower because backend must proxy operational queries

## Notes

Future intent: After v1 stabilizes, selected operational tables (e.g., work_orders, tasks, assets) may be promoted into the RLS boundary once their authorization rules, tenancy model, query performance characteristics, and security audit are complete and validated.

This ADR does not preclude a shadow schema or alternative multi-tenant design patterns; those decisions are orthogonal and captured separately. However, any multi-tenant design must respect this trust boundary during v1.

## Related Decisions

- Shadow schema should be introduced additively, not via big-bang replacement.
- Multi-tenant design will use shared-schema tenancy with organization-scoped row-level security.
- Membership table is authoritative; JWT is cached state for optimization, never the source of truth.
- ADR-001 documents auditor-system observability and logging requirements, orthogonal to this auth boundary.
