---
title: M&S Painting platform improvement plan input
type: source
status: needs-repo-verification
created: 2026-07-22T05:20:00.000Z
updated: 2026-07-22T05:20:00.000Z
verification: provisional
project: ms-painting
topic: roadmap
source_kind: attached-planning-doc
truth_level: reported
sensitivity: internal
agent_usage: reference-input
related_pages: [ms-painting-v2-program, ms-painting-v2-rollout-roadmap]
related_prs: []
related_cards: []
---

# M&S Painting platform improvement plan input

This note captures an attached planning document for the M&S Painting platform and is stored as a research/reference input for agents.

It is **not** implementation truth. Agents must verify all claims against the M&S repo and production stack before treating them as facts. Do **not** treat this as live platform documentation.

_Source: attached file on Desktop — `/Users/truecrew/Desktop/ms painting/Copy of M&S Painting Platform Improvement Plan.md` (customer-facing planning document). Summary only; full text is not duplicated here._

## Origin

Attached planning document at `/Users/truecrew/Desktop/ms painting/Copy of M&S Painting Platform Improvement Plan.md`. Filed under `knowledge/sources/` as a reported brief so Research / Chief can read it during audits. Not synthesized into project truth pages yet.

## Raw summary

This is a planning/research input only. The attached plan states a broad current feature set (RBAC, customers/jobs, scheduling/time, invoicing, inventory, fixed assets with QR, Supabase audit logging + RLS) and recommends near-term UX/reliability work, security/monitoring upgrades, V2 estimating/CRM/KPI capabilities, QuickBooks OAuth, and operational analytics. **None of those claims are verified here against the repo or production.**

## Attached plan summary

The attached plan states that the current app already includes:

- role-based access
- customers and job management
- scheduling and time tracking
- invoicing
- inventory
- fixed assets with QR support
- audit logging backed by Supabase with Row Level Security

It recommends near-term improvements in:

- branding cleanup
- error handling and clean recovery UX
- audit-log reliability and missing coverage
- inventory/asset search, filters, and pagination
- mobile navigation

It proposes security and reliability upgrades including:

- confirming and testing role/tenant rules
- adding production error monitoring (Sentry)
- adding uptime monitoring and heartbeats (Better Stack)
- strengthening secret handling and environment separation
- adding basic operational email notifications (Resend) for invites and alerts

It frames V2 upgrades around:

- contractor-grade estimating templates and pricing modes
- deposits and e-sign approvals
- estimate-to-job conversion and change orders
- CRM basics and branded proposals/invoices
- KPI dashboards for revenue, labor, materials, margin, and conversion

It also recommends:

- turning the QuickBooks stub into a real OAuth-backed integration
- improving job costing visibility for admins while keeping worker views operational
- maturing inventory/asset modules with QR labels, histories, and alerts
- adding operational dashboards and privacy-first product analytics (PostHog)

## Extracted facts

- Frontmatter `truth_level: reported` / `verification: provisional` — not task-time authoritative research.
- Existing verified-or-audited M&S program notes remain under `knowledge/projects/ms-painting-v2-*.md`; this source does not replace them.
- Claims about current product capabilities and recommended vendors/tools must be checked against `TrueCrew1/ms-painting` (schema, routes, env) before any product or implementation doc cites them.

## How agents should use this

- Treat this note as a **brief** and input for research and repo audits.
- Use it to guide:
  - M&S repo audit and capability verification
  - estimating and approval workflow design
  - legal/notice and notification surface design
  - security and production-hardening research
  - premium contractor-software differentiation analysis
- Do **not** copy statements from this note directly into product docs or implementation without:
  - checking the actual M&S repo and database schema
  - updating truth-level / `verification` only after verification

## Next research tasks this supports

- Compare claimed features vs actual code and schema in the M&S repo.
- Identify gaps in estimating, approvals, notifications, security, and reporting.
- Design a premium, contractor-grade estimating and approval engine for M&S.
- Design inline notices and audit trails for approvals, deposits, change orders, and notifications.
- Design a realistic security/monitoring stack using Supabase, Sentry, Better Stack, Cloudflare, Resend, and Bitwarden.

## Processed into

Not yet synthesized into a concept/project/decision page. Use alongside (do not overwrite):

- `knowledge/projects/ms-painting-v2-program.md`
- `knowledge/projects/ms-painting-v2-*.md` workstream notes
