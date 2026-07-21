---
title: ms-painting V2 — Tenant Branding System Architecture
type: project
status: active
confidence: high
last_reviewed: 2026-07-20
created: 2026-07-20
updated: 2026-07-20
related_pages: [ms-painting-v2-program, ms-painting-v2-debranding-audit, ms-painting-v2-document-system]
related_prs: []
related_cards: [v2-tenant-branding]
---

# ms-painting V2 — Tenant Branding System Architecture

Owner: Architecture Agent (V2 Upgrade Program). Repository: `TrueCrew1/ms-painting`
(local clone audited: `/Users/truecrew/cursor-agent-test`).

## Summary

The repo has a workspace/company model (migration
`20250625120000_company_admin_invites.sql`; tables `workspace_companies`,
`workspace_members`, `admin_invites`; hard-capped at
`MAX_COMPANY_ADMINS = 2` in `lib/types/company.ts`). Branding today is
zero-percent tenant-configurable — no branding table, no settings UI field,
no runtime injection mechanism.

## Platform vs tenant boundary

**Platform-owned (True Crew controlled, never per-tenant):** RBAC logic
(`lib/auth/session.ts`, `lib/supabase/proxy.ts`), RLS/tenant-isolation, the
admin-invite flow's platform-to-admin comms (correctly staying True
Crew-branded), audit logging, QuickBooks sync logic, document *templates*
(structure/logic, not copy).

**Tenant-owned (configurable per `workspace_companies` row):** display name,
logo asset, primary/accent color, contact info shown on invoices, invoice
footer text, calendar PRODID string, and any customer-of-the-tenant-facing
surface (QR scan page, invoice emails, ICS files, dashboard shell/title).

Rule of thumb: anything a **customer of the tenant** sees renders tenant
identity; anything in the **admin-to-admin platform relationship** stays
True Crew-branded.

## Branding settings requirements

New table `workspace_branding` (1:1 with `workspace_companies.id`, not
bolted onto the existing thin table):

- `logo_url`, `logo_alt_text`
- `display_name` (customer-facing, may differ from internal `workspace_companies.name`)
- `primary_color`, `accent_color` (hex — CSS custom properties, not new Tailwind classes)
- `contact_email`, `contact_phone`, `contact_address`
- `invoice_footer_text`
- `calendar_prodid_label`

Behind a new `/dashboard/settings/branding` page, gated by
`requireCompanyAdmin()` (same guard as the existing settings page); logo
upload to Supabase Storage (check `supabase/STORAGE.md` before adding a
second bucket).

## Injection pattern

`getSession()` in `lib/auth/session.ts` already resolves `company` once per
request and is the chokepoint every admin/company route calls through. Add
`branding` alongside `company` in `SessionContext`, fetched once in
`getSession()`.

- **QR scan page** (`app/scan/[token]/page.tsx`) — unauthenticated, needs its
  own lookup path (asset → workspace → branding), not `getSession()`.
- **ICS export** — already calls `requireAdminPage()`; swap literals for
  `session.branding?.calendar_prodid_label ?? "True Crew"`.
- **Invoice emails** — needs a `branding` argument threaded from the caller.
- **Client-side chrome** (`BrandLogo`, `app/layout.tsx` metadata) — harder,
  since `app/layout.tsx` is a static root layout. True per-tenant
  `<title>`/favicon needs subdomain-based `generateMetadata` reading a header
  set in `proxy.ts`, or accept browser-tab branding stays platform-level for
  v1 while in-page branding (logo, colors) is tenant-injected via a
  lightweight client context fed from server-rendered session data.

## Workspace model verdict

The 2-admin cap and current tenant-keying pattern is workable as a stopgap
but not a sound long-term foundation: tenancy is keyed off
`auth.users.id` of whichever admin accepted the invite first
(`current_workspace_user_id()` falls back to `auth.uid()`), meaning tenant
identity is derived from a person, not an owned entity. Restructuring to
make `workspace_companies.id` itself the RLS tenant key (demoting
`workspace_user_id` to an audit/legacy field) should happen before adding
billing or removing the 2-admin cap, since branding, billing, and seat
limits should all key off the same tenant id.
