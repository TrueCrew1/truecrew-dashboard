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
    source: "adapter",
  },
  {
    id: "req-ms-painting-v2-tenant-branding",
    topic: "M&S Painting V2 — tenant-controlled branding model",
    whyItMatters:
      "Program card 2 defines customer logos, company info, and document branding as settings — needs a researched options pass before Build Agent implementation.",
    suggestedOutcome:
      "Short design note comparing settings-schema vs. asset-injection approaches for tenant branding.",
    createdAt: "2026-07-21T12:05:00.000Z",
    source: "adapter",
  },
  {
    id: "req-ms-painting-v2-rollout",
    topic: "M&S Painting V2 — rollout sequencing and gate order",
    whyItMatters:
      "Program card 6 sequences debrand → tenant branding → documents → legal/IP. Operator sign-off is needed before Build Agent work starts on each phase.",
    suggestedOutcome:
      "Rollout checklist aligned with knowledge/projects/ms-painting-v2-rollout-roadmap.md.",
    createdAt: "2026-07-21T12:10:00.000Z",
    source: "adapter",
  },
];
