---
title: ms-painting V2 — Rollout Roadmap
type: project
status: active
confidence: high
last_reviewed: 2026-07-20
created: 2026-07-20
updated: 2026-07-20
related_pages: [ms-painting-v2-program, ms-painting-v2-debranding-audit, ms-painting-v2-tenant-branding, ms-painting-v2-document-system, ms-painting-v2-legal-ip]
related_prs: []
related_cards: [v2-rollout-planning]
---

# ms-painting V2 — Rollout Roadmap

Owner: Delivery / Planning Agent (V2 Upgrade Program). Synthesized from the
De-branding Audit, Tenant Branding Architecture, Document System V2 spec,
and Legal/IP Requirements.

## Summary

The current tenant-identity model (keyed to a person, not
`workspace_companies.id`) and the incomplete rebrand are both debts that
must be resolved before branding, billing, or resale can be layered on
safely. Legal work runs mostly in parallel with engineering but gates
customer #2, not V2.1/V2.2 engineering start.

## V2.1 — De-branding and ownership boundaries

**Scope:** Fix the 6 newly found hardcoded-branding sites (layout.tsx,
invoice email template, invite/accept page, brand-logo.tsx +
brand/styles.ts, ICS/DnD/scripts/docs leaks); make `MAX_COMPANY_ADMINS`
configurable (client + Postgres function); fix tenant-identity keying to use
`workspace_companies.id` instead of the first-accepting-admin's
`auth.users.id`.
**Depends on:** Nothing upstream — starting phase. The tenant-identity fix
should land before V2.2's branding table, since branding needs a stable
entity key.
**Phase gate:** Zero hardcoded brand strings remain outside a single default
config source; `workspace_companies.id` is verifiably the join key
everywhere identity/admin-caps/future branding-billing would attach; admin
cap is config-driven in both app code and the Postgres function.

## V2.2 — Tenant branding and document architecture

**Scope:** Build `workspace_branding` table; extend `getSession()` to carry
branding; separate unauthenticated lookup path for the QR scan page;
`getTenantBranding(tenantId)` accessor; thread placeholders through the 6
template outputs starting with invoice email; non-breaking default resolver
first, verify no visual diff, then cut to live per-tenant lookup behind a
flag.
**Depends on:** V2.1's tenant-identity fix and de-branded templates (nothing
to parameterize if strings are still hardcoded).
**Phase gate:** A second, differently-branded tenant can be provisioned and
see its own logo/colors/copy end-to-end with zero code changes — data
changes only — and the default resolver still reproduces current M&S
Painting output bit-for-bit.

## V2.3 — Legal/IP protection and resale readiness

**Scope:** IP ownership audit; original single-customer contract review;
draft reseller/customer license agreement; notice/branding placement
sign-off.
**Depends on:** Ownership audit and contract review should start
immediately, in parallel with V2.1/V2.2 — they don't touch code. The license
agreement should be drafted before customer #2 onboarding; notice placement
belongs after V2.2 ships (needs a footer/doc surface to place notices in).
**Phase gate:** Attorney confirms in writing TrueCrew holds clear resale
rights (no contractor/OSS conflicts) and the original contract carries no
exclusivity blocker; signed license agreement template ready for customer #2.

## V2.4 — Rollout planning and implementation sequencing

**Scope:** Sequence and execute customer #2 onboarding using V2.1–V2.3
outputs: settings UI polish, per-tenant flag flip order, staged migration
plan, monitoring for the flag cutover, doc/notice placement rollout.
**Depends on:** V2.1 complete, V2.2's flagged cutover working for at least
one non-default tenant, V2.3's license agreement signed for the target
customer.
**Phase gate:** Customer #2 is live on distinct branding under a signed
license agreement, original tenant unaffected, per-tenant flag is the only
distinguishing factor.

## Sequencing risks

- Legal items 1–2 block nothing technical but gate the business goal
  itself — if the audit finds a conflict, engineering work is still usable
  for the single customer, but reselling (V2.4) is blocked regardless of
  engineering readiness. Start this now, in parallel with V2.1.
- Tenant-identity rekeying (V2.1) is the highest-leverage risk item — if
  deferred, V2.2's branding table and V2.4's admin-cap removal need rework
  later, likely a bigger migration under live multi-tenant data.
- V2.2's client-side chrome (page title/favicon) may not reach true
  per-tenant parity in V2.1's timeframe — flag this early since V2.3's
  notice sign-off may assume full white-labeling engineering can't yet
  deliver.
- PDF generation and estimate/receipt features (confirmed nonexistent) are
  out of scope for all four phases as currently scoped — V2.4 rollout
  planning should not assume they exist.
