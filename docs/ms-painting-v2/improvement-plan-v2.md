![][image1]  
M\&S Painting Platform Improvement Plan 

This plan presents the next recommended improvements for the M\&S Painting platform in a customer-friendly format. It is written to describe the work in terms of reliability, professionalism, security, and workflow improvement without exposing internal implementation details. The current application already includes core operational capabilities such as role-based access, customer and job management, scheduling, time tracking, invoicing, inventory, fixed assets with QR support, and audit logging backed by Supabase with Row Level 

Security.   
\[1\] 

Current position 

The platform is already a real working operational system rather than a simple prototype, with live support for customers, jobs, scheduling, inventory, invoicing, QR-linked assets, and admin/worker roles. The next phase is focused on making the system feel more finished, more durable in production, and more valuable to painting contractors through stronger estimating, 

cleaner branding, better alerts, and better performance at scale. Immediate repair priorities   
\[2\] \[3\] \[1\] 

The first set of improvements should focus on customer-visible polish and production reliability: 

Complete the remaining brand cleanup so all public-facing pages, exports, and invite emails consistently show M\&S Painting. 

Improve error handling so users see a clean recovery experience instead of raw failures; 

\[2\]   
Next.js supports application-level error handling patterns that fit this need well. 

Strengthen audit logging so important changes are always recorded and internal actions 

have a reliable trail.   
\[1\] 

Improve inventory and asset list performance with search, filters, and pagination as records grow. 

Improve mobile navigation so the app stays clean and usable on narrower screens. 

Security and reliability

The next layer should make the platform more trustworthy behind the scenes. Supabase recommends Row Level Security for access control and supports local and advanced testing workflows that are well suited for protecting tenant isolation and permissions in multi-user apps. Sentry’s Next.js tooling is also well suited for catching unhandled production errors,   
while Better Stack provides low-cost uptime monitoring and heartbeat checks for operational 

visibility.   
\[4\] \[5\] \[6\] \[1\] \[2\] 

Recommended improvements in this phase: 

Confirm and test all role and tenant access rules. 

Add production error monitoring and alerts. 

Add uptime monitoring for the app and key workflows. 

Strengthen secret handling and environment separation. 

Add basic operational email notifications for key events such as invites and alerts. 

V2 upgrades 

After the repair work, the strongest V2 upgrade area is estimating. Painting software products increasingly compete on templates, pricing flexibility, e-signature approvals, deposits, and 

estimate-to-job conversion rather than simple quote entry alone. The recommended V2 estimate package includes:   
\[3\] \[7\] \[8\] 

Estimate templates for common job types such as interior, exterior, cabinets, and small 

commercial work.   
\[7\] \[3\] 

Room-by-room or area-based estimating with flexible pricing methods such as square-foot, 

linear-foot, hourly, and gallon-based pricing.   
\[8\] \[7\] 

Material and labor breakdowns, including coat assumptions, coverage rates, and waste 

factors.   
\[3\] \[8\] 

\[7\] \[3\]   
Built-in add-ons, exclusions, prep notes, warranty notes, and photo attachments. 

Customer approval flow with deposit requests, e-sign acceptance, status tracking, and 

estimate-to-job conversion.   
\[8\] \[3\] \[7\] 

Change order support after approval so work can adapt without losing the original estimate 

trail.   
\[3\] \[8\] 

Longer-term direction 

Once the repair phase and V2 estimating upgrades are complete, the platform can grow into a more premium contractor system with advanced reporting, stronger customer communication, better CRM automation, higher-end proposals, and eventually customer portal features. That sequence keeps the product grounded in operational value first, then adds 

premium differentiation after the core workflow is solid.12\]   
\[9\] \[10\] \[7\] \[3\] 

\[5\] \[4\]  
Add policy tests for allowed and denied cases across multiple roles and tenants.   
Error monitoring and uptime 

The best low-complexity production stack for this app is Vercel for hosting, Supabase for auth/data/storage, Better Stack for uptime and heartbeats, and Sentry for application-level errors in Next.js. Better Stack’s free offering includes monitors, heartbeats, and a status page, 

while Sentry’s free developer tier supports startup-scale error monitoring. Required work:   
\[6\] \[11\] \[2\] 

Add Sentry to capture frontend and server-side errors in production. Tag errors by route, tenant, and role where possible.   
\[11\] \[2\] 

Add Better Stack monitors for the main app, login path, and any critical background 

workflows.   
\[6\] 

Configure alert routing for failures that need human attention. \[12\]   
Use Vercel logs and observability as the hosting-level signal layer. Secrets and environment hygiene   
The app should move toward a stricter environment discipline: production-only secrets in Vercel environment variables, no secret leakage into the client bundle, and a password manager for account and key control. This is especially important if QuickBooks, email   
\[12\]   
delivery, or other external integrations are added in V2. Required work: 

Audit current environment variables by environment. 

Rotate anything shared loosely or stored outside a managed password vault. Move toward documented secret ownership and rotation. 

Separate dev, preview, and production values cleanly. 

Notifications leaving the app 

The audit identified notifications as in-app only. Moving at least key alerts into email is a 

\[1\]  
practical step before larger CRM automation or SMS work. Required work: 

Add a transactional email provider such as Resend for admin invites and operational alerts. 

Start with low-stock alerts, invite emails, and high-priority scheduling conflicts. Log send results and failures so delivery issues are observable.   
Phase 3: core V2 upgrades 

QuickBooks integration 

The audit identified the current QuickBooks connection as a stub with status UI but no real OAuth-backed sync. Replacing this with a real connection is one of the highest-value V2   
\[1\]   
operational upgrades if the platform is intended for real contractor adoption. Required work: 

Implement OAuth-based QuickBooks connection. 

Define initial sync scope: customers, invoices, payment status, and possibly chart/account mapping later. 

Log sync attempts, failures, and reconciliation exceptions. 

Costing and role-based visibility 

The app already contains job costing foundations, but V2 should strengthen visibility boundaries and reporting quality. Contractor-grade systems win when admin users can 

understand profitability without exposing unnecessary cost data to workers. Required work:   
\[13\] \[1\] 

Expand job costing summary views for labor, material, margin, and estimate-versus-actual comparison. 

Maintain admin-only visibility for sensitive costing fields. 

Keep worker views operationally focused. 

Inventory and asset maturity 

The inventory and asset modules are already meaningful differentiators, especially with QR support. V2 should make these modules more durable and more useful in day-to-day 

operations.   
\[1\]

Required work: 

Inventory QR label generation and printed label support. 

Asset history showing checkout, return, assigned job, and maintenance notes. Better search/filter/pagination on inventory and assets. 

Alert visibility for low stock and maintenance due states.   
KPI basics 

A light KPI dashboard should become a first-class management surface in V2. The emphasis should stay aggregate and operational rather than people-surveillance oriented, which aligns 

with a privacy-first product posture. Required work:   
\[14\] \[15\] 

Revenue, labor cost, material cost, and margin panels. 

Recent alerts and operational exceptions. 

Estimate conversion and invoice status summaries once estimates are implemented. 

CRM and branded documents 

For a contractor-facing product, branded proposals, invoices, and CRM basics are expected operational polish rather than luxury features. The app should support customer history, notes, 

reminders, and clean branded document outputs. Required work:   
\[9\] \[3\] 

Branded proposals, invoices, receipts, and invite templates. 

Customer notes and follow-up reminders. 

Job history surfaced from the customer record. 

Phase 4: V2 estimating engine 

Painting contractor software increasingly competes on how well estimates connect to production and billing. Products in this category emphasize templates, pricing flexibility, approvals, deposits, e-signatures, change orders, and estimate-to-job conversion as central 

workflow features rather than peripheral sales extras. Estimating goals   
\[7\] \[8\] \[3\] 

The goal is to make estimating fast enough for field use, structured enough for admin review, and connected enough that approved work flows directly into operations. The estimate module should not be a standalone quote builder; it should become the front door into scheduling, 

costing, invoicing, and customer approval workflows. Required estimate capabilities   
\[3\] \[7\] 

Saved templates for interior, exterior, cabinets, and commercial touch-up.   
\[7\] \[3\] 

\[7\]   
Room-by-room or area-based estimating. 

\[8\] \[7\]   
Mixed pricing methods: square-foot, linear-foot, hourly, and gallon-based pricing. 

\[8\] \[3\]   
Material calculator with doors, windows, coats, coverage rate, and waste factor. 

\[8\] \[7\]   
Labor and material breakdown with admin profitability preview before send. 

\[3\]  
Scope notes, exclusions, prep notes, and warranty notes built into templates.   
Add-ons and upsells such as trim, doors, ceilings, accent walls, premium paint, and prep 

upgrades.   
\[7\] 

\[7\]   
Photo attachments inside the estimate record. 

Deposit requests tied to approval.   
\[3\] \[7\] 

E-sign approval and logged acceptance state.   
\[3\] \[7\] 

\[7\]   
Estimate status pipeline: draft, sent, approved, declined, expired. 

Conversion of approved estimate into scheduled job/work order.   
\[8\] \[7\] 

Change order workflow after approval. Suggested data model direction   
\[8\] \[3\] 

Core tables should include estimates, estimate line items, estimate status history, estimate attachments, and change orders. The schema should preserve the original estimate, approval event, and subsequent approved changes so that margin analysis and customer history remain intact after work starts. 

Suggested implementation sequence 

1\. Templates and line-item engine. 

2\. Estimate builder UI with pricing modes and material calculator. 

3\. Estimate PDF / branded customer view. 

4\. Send flow, status pipeline, and acceptance capture. 

5\. Deposit request support. 

6\. Estimate-to-job conversion. 

7\. Change orders. 

8\. Actual-versus-estimated reporting. 

Phase 5: later premium layers 

After repair and V2 estimating are stable, the platform can grow into higher-end contractor software with advanced KPI dashboards, stronger customer communication, CRM automation, good/better/best proposals, financing options, AI-assisted estimating suggestions, and multi 

location management surfaces.   
\[10\] \[9\] 

These items should remain later-phase work so the current roadmap stays anchored in the strongest operational value: reliability, access control, auditability, contractor-grade 

estimating, and a smooth estimate-to-execution workflow.   
\[3\] \[7\]  
Recommended stack 

The recommended supporting stack for this app remains: 

| Purpose  | Provider  | Reason |
| ----- | ----- | ----- |
| Hosting  | Vercel  | Best fit with the current Next.js deployment path.\[12\] |
| Auth / DB / storage  | Supabase  | Existing core platform with RLS and testing support.\[1\] \[4\] |
| WAF / DNS / bot filtering  | Cloudflare  | Strong low-cost traffic protection layer.\[16\] |
| Uptime / heartbeats  | Better Stack  | Good free-tier monitor and heartbeat coverage.\[6\] |
| Error monitoring  | Sentry  | Best-fit Next.js production error monitoring.\[2\] \[11\] |
| Product analytics  | PostHog  | Privacy-first aggregate event tracking path.\[17\] \[15\] |
| Transactional email  | Resend  | Clean fit for invites and operational alerts. |
| Secrets  | Bitwarden  | Low-cost credential and secret hygiene aligned to a solo-founder budget. |

Execution priority 

The fastest high-value order is: 

1\. Branding cleanup. 

2\. Audit-log reliability and missing coverage. 

3\. Error boundary plus Sentry. 

4\. RLS review and test harness. 

5\. Inventory/assets search and pagination. 

6\. Better Stack uptime and alerting. 

7\. Real email notifications. 

8\. QuickBooks real integration. 

9\. Estimate builder and approval flow. 

10\. Estimate-to-job conversion and change orders. 

That sequence addresses the visible finish issues first, then the hidden durability issues, and 

finally the strongest revenue-driving V2 feature set. ⁂   
\[2\] \[6\] \[1\] \[3\] \[7\]

1\. https://supabase.com/docs/guides/database/postgres/row-level-security 2\. https://docs.sentry.io/platforms/javascript/guides/nextjs/ 

3\. https://pro.houzz.com/for-pros/software-painter-estimating 4\. https://supabase.com/docs/guides/local-development/testing/overview 5\. https://supabase.com/docs/guides/local-development/testing/pgtap-extended 6\. https://betterstack.com/uptime   
7\. https://www.youtube.com/watch?v=YV8Yj6YXNZ8\&themeRefresh=1 8\. https://servvian.com/paint-estimating-software/ 

9\. https://mrtask.com/blog/all-topics/7-best-crm-software-for-painting-contractors-in-2026 10\. https://www.deelo.ai/blog/best-software-for-painting-contractors-2026 11\. https://sentry.io/pricing/ 

12\. https://vercel.com/docs/security 

13\. https://knowify.com/painting-contractor-software/ 

14\. https://www.perplexity.ai/search/121585cf-1cb8-48aa-916d-63bc9706fa3c 15\. https://www.perplexity.ai/search/d2818a24-0d03-4e72-8539-6949b476dad6 16\. https://notifier.so/guides/cheap-uptime-monitoring/ 

17\. https://posthog.com/docs/product-analytics/pricing

[image1]: <data:image/png;base64,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>