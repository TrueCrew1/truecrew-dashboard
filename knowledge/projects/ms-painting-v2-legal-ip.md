---
title: ms-painting V2 — Legal / IP Protection Requirements
type: project
status: active
confidence: medium
last_reviewed: 2026-07-20
created: 2026-07-20
updated: 2026-07-20
related_pages: [ms-painting-v2-program, ms-painting-v2-rollout-roadmap]
related_prs: []
related_cards: [v2-legal-ip]
---

# ms-painting V2 — Legal / IP Protection Requirements

Owner: Legal / Compliance Agent (V2 Upgrade Program).

## Not legal advice

This document is a practical requirements checklist prepared by an AI
assistant to help TrueCrew organize its thinking before engaging counsel. It
is **not legal advice**, does not create an attorney-client relationship,
and must not be used as the basis for any actual license, terms of service,
or notice without review and drafting by a licensed attorney in the
relevant jurisdiction(s).

## License/ToS protection requirements

For a template product resold to multiple painting contractors, the risk
profile changes from a single custom build: customers now have direct
incentive to compare notes, share access, or spin off competing tools.

- **Anti-reuse** — limit use to the customer's own painting-contractor
  operations only; prevents repurposing the platform for a side product.
- **Anti-resale** — prohibit reselling/re-licensing/bundling into the
  customer's own paid offering.
- **Anti-sublicensing** — prohibit granting access to third parties beyond
  the customer's own authorized users (painting contractors often have loose
  subcontractor/affiliate-crew networks).
- **Anti-copying** — prohibit duplicating the codebase, schema, or UI
  templates outside the licensed instance.
- **Anti-derivative-works** — prohibit forking/modifying to build a
  competing product.
- **Anti-reverse-engineering** — prohibit decompiling or extracting
  source/architecture from the delivered product.
- **Audit/usage-monitoring right** — TrueCrew's right to verify compliance
  (seat/instance counts) — harder to detect across many customers than one.
- **Termination-on-breach + data return/deletion terms.**

## Notice placement

- **App UI** — persistent footer notice on every authenticated page
  ("© TrueCrew LLC. Proprietary and confidential. Unauthorized reproduction
  or resale prohibited."), plus an About/Legal settings panel.
- **Generated documents** — invoices/PDFs/emails carry a "Powered by
  [Product Name], a TrueCrew LLC product" line.
- **Source code headers** — standard copyright header on core files, even
  in a private repo (matters if code is ever shared with a contractor,
  auditor, or acquirer).
- **Repo README/LICENSE** — explicit proprietary LICENSE file (not
  MIT/Apache), README statement clarifying closed-source status.

## Internal IP prerequisites

- **Open-source license audit** — confirm no dependency carries copyleft
  terms (GPL/AGPL) that would force TrueCrew to open-source its own code.
- **Contractor/freelancer IP assignment check** — confirm every non-employee
  contributor signed a work-for-hire/IP assignment agreement.
- **Employee IP assignment check** — same, especially pre-policy contributors.
- **Third-party asset check** — icons/templates/sample data license terms
  compatible with commercial resale.
- **Original single-customer contract review** — check whether the M&S
  Painting agreement grants any ownership, exclusivity, or "most favored
  customer" claim that would conflict with reselling to competitors.

## Priority order for legal review

1. IP ownership audit (open-source conflicts + contractor/employee
   assignments) — resolves whether TrueCrew can legally resell at all.
2. Original single-customer contract review — exclusivity/ownership
   conflicts before selling to a second customer.
3. Reseller/customer license agreement (the six anti- terms above) — needed
   before onboarding customer #2.
4. Notice/branding placement sign-off — lower urgency, follows the license
   agreement.
