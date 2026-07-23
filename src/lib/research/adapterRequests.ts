import type { ResearchRequest } from "./types";

/**
 * Hand-maintained M&S program research backlog — adapter-backed, not live API data.
 * Matches ms-painting V2 program cards in src/data/v2Program.ts and
 * knowledge/projects/ms-painting-v2-*.md.
 */
export const ADAPTER_RESEARCH_REQUESTS: ResearchRequest[] = [
  {
    id: "req-ms-painting-v2-debrand",
    topic: "M&S Painting V2 — debranding audit",
    whyItMatters:
      "Program card 1 (TrueCrew1/ms-painting): locate every hardcoded company-specific brand, logo, contact detail, and tenant assumption before multi-tenant work.",
    suggestedOutcome:
      "Findings note in knowledge/sources/ linked from knowledge/projects/ms-painting-v2-debranding-audit.md.",
    createdAt: "2026-07-21T12:00:00.000Z",
    updatedAt: "2026-07-21T12:00:00.000Z",
    source: "adapter",
    status: "queued",
  },
  {
    id: "req-ms-painting-v2-tenant-branding",
    topic: "M&S Painting V2 — tenant-controlled branding model",
    whyItMatters:
      "Program card 2 defines customer logos, company info, and document branding as settings — needs a researched options pass before Build Agent implementation.",
    suggestedOutcome:
      "Short design note comparing settings-schema vs. asset-injection approaches for tenant branding.",
    createdAt: "2026-07-21T12:05:00.000Z",
    updatedAt: "2026-07-21T12:05:00.000Z",
    source: "adapter",
    status: "queued",
  },
  {
    id: "req-ms-painting-v2-rollout",
    topic: "M&S Painting V2 — rollout sequencing and gate order",
    whyItMatters:
      "Program card 6 sequences debrand → tenant branding → documents → legal/IP. Operator sign-off is needed before Build Agent work starts on each phase.",
    suggestedOutcome:
      "Rollout checklist aligned with knowledge/projects/ms-painting-v2-rollout-roadmap.md.",
    createdAt: "2026-07-21T12:10:00.000Z",
    updatedAt: "2026-07-21T12:10:00.000Z",
    source: "adapter",
    status: "queued",
  },
  {
    id: "req-ms-painting-v2-market-scan",
    topic: "Painter SaaS market scan — competitors, features, performance",
    whyItMatters:
      "V2 program card 'Painter SaaS Market Scan': ground the V2 estimating/CRM/proposal scope in what competing painter SaaS (Houzz Pro, Knowify, and the improvement plan's cited roundups) actually ship, charge, and compete on.",
    suggestedOutcome:
      "Findings note at knowledge/findings/m-and-s/painter-saas-market-scan.md — feature and pricing comparison plus a match-vs-skip verdict for V2.",
    createdAt: "2026-07-22T13:00:00.000Z",
    updatedAt: "2026-07-22T13:00:00.000Z",
    source: "adapter",
    status: "queued",
  },
  {
    id: "req-ms-painting-v2-design-standard",
    topic: "TrueCrew design standard — V1 layout and design uplift",
    whyItMatters:
      "V2 program card 'TrueCrew Design Standard': standardized TrueCrew formatting, color, and layout so the deployed product is a resellable TrueCrew asset rather than M&S-themed; includes the improvement plan's V1 polish items (mobile navigation, error states, list performance).",
    suggestedOutcome:
      "Findings note at knowledge/findings/m-and-s/truecrew-design-standard.md — design tokens, component conventions, and a prioritized V1 uplift list.",
    createdAt: "2026-07-22T13:05:00.000Z",
    updatedAt: "2026-07-22T13:05:00.000Z",
    source: "adapter",
    status: "queued",
  },
  {
    id: "req-ms-painting-v2-legal-doc-set",
    topic: "Standard legal document set for deployed SaaS instances",
    whyItMatters:
      "V2 program card 'Legal / IP Protection': every deployed instance should ship a standard legal set (terms of service, privacy policy, subscription/license terms). Research common SaaS practice only — final documents require attorney review, per the card's standing blocker.",
    suggestedOutcome:
      "Findings note under knowledge/findings/m-and-s/ listing the required document set, common contents, and open questions for counsel.",
    createdAt: "2026-07-22T13:10:00.000Z",
    updatedAt: "2026-07-22T13:10:00.000Z",
    source: "adapter",
    status: "queued",
  },
];
