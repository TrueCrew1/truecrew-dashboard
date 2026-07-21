---
title: ms-painting V2 — De-branding Audit
type: project
status: active
confidence: high
last_reviewed: 2026-07-20
created: 2026-07-20
updated: 2026-07-20
related_pages: [ms-painting-v2-program, ms-painting-v2-tenant-branding]
related_prs: []
related_cards: [v2-debranding-audit]
---

# ms-painting V2 — De-branding Audit

Owner: Research Agent (V2 Upgrade Program). Repository: `TrueCrew1/ms-painting`
(local clone audited: `/Users/truecrew/cursor-agent-test`, confirmed matching
remote). Builds on a prior advisory session's findings (3 leaks) — this pass
re-verified those and swept the full repo for more.

## Summary

The three previously-flagged leaks are still present and unchanged. A fresh
full-repo grep surfaced 6 more hardcoded-branding sites the prior audit
missed, plus the root cause: a one-off script
(`scripts/rebrand-ms-painting.mjs`) did a naive find/replace from the original
"True Crew" build to "M&S Painting" and never touched `.json` files,
transactional email templates, or strings added after it ran. The Supabase
schema (`workspace_companies`, `company_id` FK + RLS) is already
multi-tenant-shaped — the blockers are almost entirely presentation-layer,
not data-model.

## Branding leaks found

| File:line | What's hardcoded | Customer-visible? |
|---|---|---|
| `app/layout.tsx:17-23` | Page `<title>`, meta description, favicon hardcode "M&S Painting" / `/ms-painting-logo.png` | Yes — every browser tab/SEO snippet |
| `lib/invoices/email-template.ts:29,61,63,89` | Invoice email subject + body says "M&S Painting" | Yes — highest-impact, reaches end customers |
| `app/scan/[token]/page.tsx:60` (confirmed) | Public QR scan page footer says "True Crew · Asset scan" | Yes |
| `app/invite/accept/page.tsx:106` | "Your True Crew admin account is ready." | Yes — every new admin sees this |
| `lib/admin-invites/email-template.ts:9,23,32,47` (confirmed) | Admin invite email subject/body/sign-off say "True Crew" | Yes |
| `app/dashboard/jobs/schedule/export.ics/route.ts:38,51` (confirmed, expanded) | `PRODID` embeds "M&S Painting" + "True Crew"; UID embeds `@ms-painting` | Partial — leaks into shared `.ics` files |
| `components/brand/brand-logo.tsx:14-15`, `lib/brand/styles.ts:1,35` | `BRAND_NAME` constant + hardcoded logo path | Yes — app header/nav |
| `components/jobs/jobs-schedule-board.tsx:16-17` | Drag-and-drop MIME types named `application/x-ms-painting-*` | No — internal only |
| `package.json`, `scripts/seed-ms-painting-admin.mjs`, `scripts/rebrand-ms-painting.mjs` | Company name in script/file names | No — dev tooling only |
| `README.md`, `docs/*.md`, `supabase/STORAGE.md` | Extensive brand references | No — internal docs |

## Non-branding reuse blockers

- Color palette hardcoded as Tailwind literals in `lib/brand/styles.ts`
  (`bg-blue-600` etc.) rather than theme tokens — every tenant needs a code
  change to get their own brand color today.
- `MAX_COMPANY_ADMINS = 2` in `lib/types/company.ts:27`, enforced both
  client-side and in a Postgres function (`count_company_admins`,
  `supabase/migrations/20250625120000_company_admin_invites.sql:251`) — a
  flat, non-configurable-per-tenant cap baked into the DB layer.
- No `manifest.json` / no per-tenant logo storage — logo is a single static
  file referenced by absolute path, no DB column or storage bucket for a
  tenant-uploaded logo.
- The multi-tenant schema (`workspace_companies`, `company_id` scoping, RLS)
  already exists — an asset, not a blocker; should anchor the Tenant Branding
  System rather than requiring a data-model rewrite.

## Recommended next step

Prioritize collapsing hardcoded name/logo/color references into a single
per-tenant branding record resolved via `company_id`/`workspace_companies`,
starting with the invoice and invite email templates (highest reputational
risk — they reach people outside the company). Treat
`scripts/rebrand-ms-painting.mjs` as a cautionary example: a future
"add a new tenant" flow must not rely on manual string-replace scripts.
