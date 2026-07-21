/**
 * V2 Upgrade Program — ms-painting repositioning initiative (TrueCrew1/ms-painting).
 * Deliberately separate from ChiefSpecialist/AgentWorkItem (src/components/chief/types.ts):
 * this tracks a cross-repo initiative's workstream cards, not Chief's own
 * agent-work board. Content is real first-pass output filed under
 * knowledge/projects/ms-painting-v2-*.md, not placeholder text — see each
 * card's docPath.
 */

export type V2ProgramOwnerAgent =
  | "Orchestrator Agent"
  | "Research Agent"
  | "Architecture Agent"
  | "Document Agent"
  | "Legal / Compliance Agent"
  | "Delivery / Planning Agent";

export type V2ProgramStatusTone = "green" | "yellow" | "steel";

export interface V2ProgramCard {
  id: string;
  title: string;
  purpose: string;
  ownerAgent: V2ProgramOwnerAgent;
  status: string;
  statusTone: V2ProgramStatusTone;
  currentTask: string;
  blockers: string;
  nextOutput: string;
  priorityBadge: "Priority 1";
  repoRef: string;
  /** Filed knowledge-base doc backing this card's content — see knowledge/projects/. */
  docPath: string;
  /** True only for the master control card, shown first and larger. */
  isMaster?: boolean;
}

export const V2_PROGRAM_CARDS: V2ProgramCard[] = [
  {
    id: "v2-upgrade-program",
    title: "V2 Upgrade Program",
    purpose:
      "Master control card for the full V2 upgrade of ms-painting — tracks overall program status, current phase, major blockers, and next approval needed.",
    ownerAgent: "Orchestrator Agent",
    status: "Active — V2.1 in progress",
    statusTone: "yellow",
    currentTask:
      "V2.1 De-branding and ownership boundaries: first-pass audits/specs complete across all 5 workstreams; awaiting sign-off to begin code changes.",
    blockers:
      "None blocking V2.1 start. Legal ownership audit has not been run by an actual attorney yet — engineering can proceed in parallel, resale cannot.",
    nextOutput:
      "Sign-off decision on starting V2.1 code changes (branding-leak fixes, tenant-identity rekey, configurable admin cap).",
    priorityBadge: "Priority 1",
    repoRef: "TrueCrew1/ms-painting",
    docPath: "knowledge/projects/ms-painting-v2-program.md",
    isMaster: true,
  },
  {
    id: "v2-debranding-audit",
    title: "De-branding Audit",
    purpose:
      "Audit ms-painting for hardcoded company-specific branding, business identity, logo usage, contact details, copy, document branding, and tenant-specific assumptions.",
    ownerAgent: "Research Agent",
    status: "First pass complete",
    statusTone: "green",
    currentTask:
      "Filed: 9 branding leaks (3 confirmed from a prior audit, 6 newly found) plus 3 non-branding reuse blockers (hardcoded admin cap, hardcoded colors, no per-tenant logo storage).",
    blockers: "None.",
    nextOutput:
      "Hand off leak list to V2.1 implementation — highest priority is the invoice email template (reaches end customers of the tenant).",
    priorityBadge: "Priority 1",
    repoRef: "TrueCrew1/ms-painting",
    docPath: "knowledge/projects/ms-painting-v2-debranding-audit.md",
  },
  {
    id: "v2-tenant-branding",
    title: "Tenant Branding System",
    purpose:
      "Define how ms-painting should support customer-controlled branding through settings, including logos, company information, document branding, and reusable asset injection.",
    ownerAgent: "Architecture Agent",
    status: "First pass complete",
    statusTone: "green",
    currentTask:
      "Filed: platform-vs-tenant boundary, workspace_branding table design, session-based injection pattern, verdict on the current 2-admin workspace model.",
    blockers:
      "Implementation depends on V2.1's tenant-identity rekey landing first, so the branding table's foreign key targets a stable entity id.",
    nextOutput:
      "workspace_branding schema + getTenantBranding() accessor, once V2.1 lands.",
    priorityBadge: "Priority 1",
    repoRef: "TrueCrew1/ms-painting",
    docPath: "knowledge/projects/ms-painting-v2-tenant-branding.md",
  },
  {
    id: "v2-document-system",
    title: "Document System V2",
    purpose:
      "Convert the existing document approach into a reusable True Crew document system with shared templates and runtime placeholders for tenant-specific data.",
    ownerAgent: "Document Agent",
    status: "First pass complete",
    statusTone: "green",
    currentTask:
      "Filed: inventory of 6 existing template outputs, a placeholder list, and a 4-step migration path from hardcoded strings to tenant-sourced values.",
    blockers:
      "No PDF generation or estimate/receipt features exist yet in the repo — scope is currently limited to invoices, invite emails, ICS export, and QR labels.",
    nextOutput:
      "Thread the branding param through lib/invoices/email-template.ts first (highest customer visibility).",
    priorityBadge: "Priority 1",
    repoRef: "TrueCrew1/ms-painting",
    docPath: "knowledge/projects/ms-painting-v2-document-system.md",
  },
  {
    id: "v2-legal-ip",
    title: "Legal / IP Protection",
    purpose:
      "Define the legal and product requirements needed to protect the platform, templates, and reusable document suite from unauthorized reuse, resale, sublicensing, copying, or cloning.",
    ownerAgent: "Legal / Compliance Agent",
    status: "First pass complete — not legal advice, needs attorney review",
    statusTone: "steel",
    currentTask:
      "Filed: license/ToS requirement list (anti-reuse/resale/sublicense/copy/derivative/reverse-engineer), notice placement recommendations, internal IP prerequisites, priority order for legal review.",
    blockers:
      "Awaiting an actual attorney engagement — nothing filed so far is legal clearance to resell.",
    nextOutput:
      "IP ownership audit (open-source + contractor/employee IP assignment) and original single-customer contract review, run by counsel.",
    priorityBadge: "Priority 1",
    repoRef: "TrueCrew1/ms-painting",
    docPath: "knowledge/projects/ms-painting-v2-legal-ip.md",
  },
  {
    id: "v2-rollout-planning",
    title: "Rollout Planning",
    purpose:
      "Define the staged V2 implementation sequence for ms-painting, including dependencies, phase gates, and delivery order.",
    ownerAgent: "Delivery / Planning Agent",
    status: "First pass complete",
    statusTone: "green",
    currentTask:
      "Filed: scope, dependencies, and a phase-gate criterion for each of V2.1–V2.4, plus 4 cross-phase sequencing risks.",
    blockers: "None — sequencing depended on the other 4 workstreams' outputs, all now filed.",
    nextOutput: "Track V2.1 phase-gate completion once implementation starts.",
    priorityBadge: "Priority 1",
    repoRef: "TrueCrew1/ms-painting",
    docPath: "knowledge/projects/ms-painting-v2-rollout-roadmap.md",
  },
];
