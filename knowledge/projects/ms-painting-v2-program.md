---
title: ms-painting V2 Upgrade Program
type: project
status: active
confidence: high
last_reviewed: 2026-07-20
created: 2026-07-20
updated: 2026-07-20
related_pages: [ms-painting-v2-debranding-audit, ms-painting-v2-tenant-branding, ms-painting-v2-document-system, ms-painting-v2-legal-ip, ms-painting-v2-rollout-roadmap, truecrew-dashboard]
related_prs: []
related_cards: [v2-upgrade-program, v2-debranding-audit, v2-tenant-branding, v2-document-system, v2-legal-ip, v2-rollout-planning]
---

# ms-painting V2 Upgrade Program

Owner: Orchestrator Agent. Repository: `TrueCrew1/ms-painting` (real, private;
local audited clone: `/Users/truecrew/cursor-agent-test`, confirmed matching
remote). Master single source of truth for the initiative to reposition
`ms-painting` from a single-customer implementation (currently white-labeled
for "M&S Painting") into a reusable, resellable, True-Crew-owned platform.

## Program goal

Take the ms-painting codebase — a genuinely broad, well-structured v1
painting-contractor field-ops product (RLS on every business table,
real scheduling-conflict logic, thoughtful job costing) built from a
True Crew template — and make it sellable to more than one contractor
without a manual rebrand script per customer.

## Current phase

**V2.1 — De-branding and ownership boundaries.** First-pass audit and
architecture direction are complete (below); no code changes have shipped
yet. Legal's ownership audit (item 1 of its priority list) can and should
start in parallel now — it gates nothing technical but gates the ability to
resell to a second customer regardless of engineering progress.

## Workstream status

| Workstream | Owner | Status | Output |
|---|---|---|---|
| De-branding Audit | Research Agent | First pass complete | [[ms-painting-v2-debranding-audit]] — 9 hardcoded-branding sites (3 previously known, 6 new), 3 non-branding reuse blockers |
| Tenant Branding System | Architecture Agent | First pass complete | [[ms-painting-v2-tenant-branding]] — platform/tenant boundary, `workspace_branding` table design, injection pattern |
| Document System V2 | Document Agent | First pass complete | [[ms-painting-v2-document-system]] — 6-document inventory, placeholder model, 4-step migration path |
| Legal / IP Protection | Legal/Compliance Agent | First pass complete (not legal advice — needs attorney review) | [[ms-painting-v2-legal-ip]] — license/ToS requirements, notice placement, internal IP prerequisites |
| Rollout Planning | Delivery/Planning Agent | First pass complete | [[ms-painting-v2-rollout-roadmap]] — V2.1–V2.4 phase gates and sequencing risks |

## Key findings across workstreams

1. **The branding problem is presentation-layer, not data-model.** The
   Supabase schema (`workspace_companies`, `company_id` FK + RLS) is already
   multi-tenant-shaped. The blockers are hardcoded strings/constants, not a
   schema rewrite.
2. **Tenant identity has a structural bug that should be fixed before
   anything else.** `current_workspace_user_id()` keys tenancy off whichever
   admin's `auth.users.id` first accepted the invite — a person, not
   `workspace_companies.id`, an entity. Branding, billing, and seat limits
   should all key off the same tenant id, so this should land in V2.1.
3. **Legal work is not on the engineering critical path but is on the
   resale critical path.** The IP ownership audit and original
   single-customer contract review can start today, in parallel with V2.1
   engineering, and should — they don't block engineering, but engineering
   readiness doesn't matter if the ownership audit finds a conflict.
4. **Scope guardrail:** no PDF generation, estimate/bid, or receipt features
   exist in the repo today. V2.4 rollout planning should not assume they do.

## Blockers

- None blocking the start of V2.1 engineering work.
- Legal ownership audit and original-contract review have not been
  initiated by an actual attorney yet — first-pass requirements exist
  ([[ms-painting-v2-legal-ip]]) but nothing here should be treated as legal
  clearance to resell.

## Next approval needed

Whether to proceed from first-pass audits/specs (this brief) into actual
V2.1 code changes against `ms-painting` — specifically: (a) fixing the 6
newly found branding leaks, (b) the tenant-identity rekeying fix, and (c)
making `MAX_COMPANY_ADMINS` configurable. All three are scoped in
[[ms-painting-v2-debranding-audit]] and [[ms-painting-v2-rollout-roadmap]]
and are ready to implement pending sign-off — no code in `ms-painting` has
been modified so far, consistent with this program's advisory-first
approach.
