---
title: ms-painting V2 — Document System V2 Specification
type: project
status: active
confidence: high
last_reviewed: 2026-07-20
created: 2026-07-20
updated: 2026-07-20
related_pages: [ms-painting-v2-program, ms-painting-v2-debranding-audit, ms-painting-v2-tenant-branding]
related_prs: []
related_cards: [v2-document-system]
---

# ms-painting V2 — Document System V2 Specification

Owner: Document Agent (V2 Upgrade Program). Repository: `TrueCrew1/ms-painting`
(local clone audited: `/Users/truecrew/cursor-agent-test`).

## Summary

Six customer/worker-facing template outputs exist, all hardcoded to
"M&S Painting" / "True Crew" with no tenant parameterization. No PDF
generation exists anywhere in the repo. No estimate/bid, receipt, or
audit-log export features exist yet — only invoices, admin-invite emails,
ICS calendar export, and QR asset labels/scan pages. A partial branding seam
already exists (`lib/brand/styles.ts` → `BRAND_NAME` constant) that V2 can
extend rather than replace.

## Current document inventory

| File | Produces | State |
|---|---|---|
| `lib/invoices/email-template.ts` | Invoice email (Resend) | Hardcoded brand in subject/footer/HTML header; invoice data itself already parameterized |
| `lib/invoices/send-email.ts` | Transport | Env-var based, not per-tenant |
| `lib/admin-invites/email-template.ts` | Admin-invite email | `companyName` already dynamic; "True Crew" branding hardcoded elsewhere |
| `lib/admin-invites/send-email.ts` | Transport | Same env-var pattern |
| `app/dashboard/jobs/schedule/export.ics/route.ts` | ICS calendar export | `PRODID`/UID hardcoded; event content dynamic |
| `app/dashboard/jobs/schedule/export/route.ts` | CSV schedule export | No brand strings, low risk |
| `components/assets/asset-qr-label.tsx` | Printable QR label | Already reusable — no hardcoded brand text |
| `app/scan/[token]/page.tsx` | Public asset-scan page | Hardcoded eyebrow text; rest data-driven |
| `app/layout.tsx` | Site metadata | Hardcoded title/description/favicon |
| `components/brand/brand-logo.tsx` | Logo image | Hardcoded src + alt from `BRAND_NAME` |
| `lib/brand/styles.ts` | Class tokens + `BRAND_NAME` | Good seed for tenant lookup; colors also hardcoded |

## Template + placeholder model

Shared-template + runtime-placeholder pattern: one canonical template
function per document type (already the shape of the existing templates),
with brand-specific strings sourced from a `getTenantBranding(tenantId)`
accessor instead of a literal or the `BRAND_NAME` import. No new templating
engine needed — native TS template literals stay the pattern, just backed by
`branding` instead of constants.

## Placeholder list

`company_name`, `logo_url`, `support_email`, `from_email`,
`invoice_footer_note`, `ics_prodid`, `scan_page_label`,
`site_title`/`site_description`, `favicon_url`, `primary_color`,
`admin_invite_signoff`.

## Migration approach

1. **Non-breaking default first** — add a `TenantBranding` type + resolver
   that returns today's M&S Painting values as a hardcoded default. Zero
   behavior change.
2. **Thread the param through** — invoice email template first (highest
   visibility), then admin-invite, ICS, scan page, `app/layout.tsx`/`BrandLogo`.
3. **Verify per-step** — confirm the M&S Painting tenant renders identically
   after each file, since the default matches current hardcoded values exactly.
4. **Cut over last** — once the Tenant Branding System supplies real
   per-tenant records, swap the default resolver for the live lookup,
   validated against the M&S Painting tenant's row before removing the
   hardcoded fallback.
