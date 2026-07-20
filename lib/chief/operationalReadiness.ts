import { existsSync } from "node:fs";
import { join } from "node:path";
import { detectV1CapabilityPresence } from "../ops/capabilityPresence.js";
import { INTEGRATIONS_INVENTORY } from "../ops/integrationsInventory.js";
import type { GovernanceStatus } from "../ops/types.js";
import { TOOL_GOVERNANCE_CATALOG } from "../ops/toolGovernanceCatalog.js";
import { buildRepoHygieneSummary } from "../ops/repoHygieneSummary.js";
import { isVaultConfigured } from "../obsidian/config.js";
import { isSupabaseConfigured } from "../supabase/admin.js";

export type ReadinessStatus = "ready" | "partial" | "blocked" | "not_wired";

export type OperationalReadinessDomainId =
  | "chief"
  | "builder"
  | "librarian"
  | "repo-hygiene"
  | "integrations"
  | "reporting";

export interface OperationalReadinessDomain {
  id: OperationalReadinessDomainId;
  label: string;
  status: ReadinessStatus;
  summary: string;
  blockers: string[];
  warnings: string[];
  partialNotes: string[];
}

export interface OperationalReadinessSummary {
  generatedAt: string;
  overallStatus: ReadinessStatus;
  domains: OperationalReadinessDomain[];
  blockers: string[];
  warnings: string[];
  partialOrNotWired: string[];
  sources: string[];
}

function mapGovernanceToReadiness(status: GovernanceStatus): ReadinessStatus {
  switch (status) {
    case "active":
      return "ready";
    case "partial":
      return "partial";
    case "planned":
    case "not_wired":
      return "not_wired";
  }
}

function findTool(id: string) {
  const entry = TOOL_GOVERNANCE_CATALOG.find((tool) => tool.id === id);
  if (!entry) {
    throw new Error(`Missing tool governance entry: ${id}`);
  }
  return entry;
}

function envConfigured(envName: string): boolean {
  return Boolean(process.env[envName]?.trim());
}

function deriveOverallStatus(domains: readonly OperationalReadinessDomain[]): ReadinessStatus {
  if (domains.some((domain) => domain.status === "blocked")) return "blocked";
  if (domains.every((domain) => domain.status === "ready")) return "ready";
  if (domains.every((domain) => domain.status === "not_wired")) return "not_wired";
  return "partial";
}

function collectDomainSignals(
  domains: readonly OperationalReadinessDomain[],
): Pick<OperationalReadinessSummary, "blockers" | "warnings" | "partialOrNotWired"> {
  const blockers = domains.flatMap((domain) =>
    domain.blockers.map((item) => `${domain.label}: ${item}`),
  );
  const warnings = domains.flatMap((domain) =>
    domain.warnings.map((item) => `${domain.label}: ${item}`),
  );
  const partialOrNotWired = domains.flatMap((domain) =>
    domain.partialNotes.map((item) => `${domain.label}: ${item}`),
  );

  return { blockers, warnings, partialOrNotWired };
}

function buildChiefDomain(root: string): OperationalReadinessDomain {
  const chief = findTool("chief");
  const capabilities = detectV1CapabilityPresence(root);
  const warnings: string[] = [];
  const partialNotes: string[] = [];

  if (!capabilities.approvalActivity) {
    warnings.push("Approval activity store module is missing.");
  }

  if (!isSupabaseConfigured()) {
    warnings.push("Supabase is not configured — live approval persistence unavailable.");
  }

  if (!isVaultConfigured()) {
    warnings.push("Obsidian vault is not configured — durable activity/mission writes skipped.");
  }

  if (!capabilities.governedSlack) {
    partialNotes.push("Governed Slack notifications module not present.");
  } else if (!envConfigured("SLACK_WEBHOOK_URL")) {
    partialNotes.push("SLACK_WEBHOOK_URL unset — outbound Slack notifications no-op.");
  }

  const status: ReadinessStatus =
    warnings.some((warning) => warning.includes("missing"))
      ? "partial"
      : mapGovernanceToReadiness(chief.status);

  return {
    id: "chief",
    label: "Chief",
    status,
    summary:
      "Governed approvals, Today activity, and Chief home signals are wired; durable paths depend on Supabase and vault configuration.",
    blockers: [],
    warnings,
    partialNotes,
  };
}

function buildBuilderDomain(root: string): OperationalReadinessDomain {
  const builder = findTool("builder-agent");
  const hasProposalFactory = existsSync(
    join(root, "src/components/chief/buildAgentTestProposal.ts"),
  );
  const hasBuilderReport = existsSync(join(root, "lib/build/builderReport.ts"));
  const partialNotes: string[] = [];

  if (!hasProposalFactory) {
    return {
      id: "builder",
      label: "Builder",
      status: "not_wired",
      summary: "Builder runtime QA proposal factory is not present in this branch.",
      blockers: [],
      warnings: [],
      partialNotes: ["buildAgentTestProposal.ts missing."],
    };
  }

  if (!hasBuilderReport) {
    partialNotes.push("Builder V1 structured report module (lib/build/builderReport.ts) not present.");
  }

  return {
    id: "builder",
    label: "Builder",
    status: hasBuilderReport ? "partial" : mapGovernanceToReadiness(builder.status),
    summary: hasBuilderReport
      ? "Runtime QA proposals and structured Builder reports are available; no autonomous Builder runner."
      : "Runtime QA proposals are wired; structured Builder reports are not present on this branch.",
    blockers: [],
    warnings: [],
    partialNotes,
  };
}

function buildLibrarianDomain(): OperationalReadinessDomain {
  const librarian = findTool("librarian-agent");
  const partialNotes = [
    "Optional Ollama refinement only; production artifact writes require vault configuration.",
  ];

  if (!envConfigured("LIBRARIAN_AI_ENABLED")) {
    partialNotes.push("LIBRARIAN_AI_ENABLED is off — AI refinement skipped.");
  }

  return {
    id: "librarian",
    label: "Librarian",
    status: mapGovernanceToReadiness(librarian.status),
    summary: "Artifact filing exists; AI refinement and vault writes are env-gated.",
    blockers: [],
    warnings: !isVaultConfigured()
      ? ["Vault not configured — librarian vault writes will be skipped."]
      : [],
    partialNotes,
  };
}

function buildRepoHygieneDomain(root: string): OperationalReadinessDomain {
  const hygiene = buildRepoHygieneSummary(root);

  return {
    id: "repo-hygiene",
    label: "Repo hygiene",
    status: hygiene.status,
    summary: hygiene.summary,
    blockers: hygiene.ciWorkflowPresent ? [] : ["CI workflow file missing."],
    warnings: [],
    partialNotes: hygiene.notes.filter((note) => note.includes("not wired") || note.includes("manual")),
  };
}

function buildIntegrationsDomain(): OperationalReadinessDomain {
  const partial = INTEGRATIONS_INVENTORY.filter((entry) => entry.status === "partial");
  const notWired = INTEGRATIONS_INVENTORY.filter((entry) => entry.status === "not_wired");
  const warnings: string[] = [];

  for (const entry of INTEGRATIONS_INVENTORY.filter((item) => item.status === "active")) {
    const missingEnv = entry.envDependencies.filter((envName) => !envConfigured(envName));
    if (missingEnv.length > 0) {
      warnings.push(`${entry.id} active integration missing env: ${missingEnv.join(", ")}`);
    }
  }

  const partialNotes = [
    ...partial.map((entry) => `${entry.id} is partial — ${entry.notes ?? entry.failureBehavior}`),
    ...notWired.map((entry) => `${entry.id} is not_wired — ${entry.notes ?? entry.purpose}`),
  ];

  const status: ReadinessStatus =
    notWired.length > 0 || partial.length > 0 ? "partial" : "ready";

  return {
    id: "integrations",
    label: "Integrations",
    status,
    summary: `${INTEGRATIONS_INVENTORY.filter((entry) => entry.status === "active").length} active, ${partial.length} partial, ${notWired.length} not_wired integrations in the V1 inventory.`,
    blockers: [],
    warnings,
    partialNotes,
  };
}

function buildReportingDomain(root: string): OperationalReadinessDomain {
  const capabilities = detectV1CapabilityPresence(root);
  const partialNotes: string[] = [];
  const warnings: string[] = [];

  if (!capabilities.dailyTurnover) {
    partialNotes.push("Daily turnover module (lib/chief/dailyTurnover.ts) not present on this branch.");
  }

  if (!capabilities.builderReport) {
    partialNotes.push("Builder V1 structured report module not present on this branch.");
  }

  if (capabilities.dailyTurnover && !envConfigured("SLACK_WEBHOOK_URL")) {
    warnings.push("Turnover module present but SLACK_WEBHOOK_URL is unset.");
  }

  let status: ReadinessStatus;
  if (capabilities.dailyTurnover || capabilities.builderReport) {
    status = "partial";
  } else {
    status = "not_wired";
  }

  return {
    id: "reporting",
    label: "Reporting",
    status,
    summary:
      status === "not_wired"
        ? "No daily turnover or Builder structured-report modules on this branch."
        : "Reporting helpers exist but remain operator-triggered and env-gated in V1.",
    blockers: [],
    warnings,
    partialNotes,
  };
}

export function buildOperationalReadinessSummary(
  root = process.cwd(),
  generatedAt = new Date().toISOString(),
): OperationalReadinessSummary {
  const domains: OperationalReadinessDomain[] = [
    buildChiefDomain(root),
    buildBuilderDomain(root),
    buildLibrarianDomain(),
    buildRepoHygieneDomain(root),
    buildIntegrationsDomain(),
    buildReportingDomain(root),
  ];

  const signals = collectDomainSignals(domains);

  return {
    generatedAt,
    overallStatus: deriveOverallStatus(domains),
    domains,
    blockers: signals.blockers,
    warnings: signals.warnings,
    partialOrNotWired: signals.partialOrNotWired,
    sources: [
      "lib/ops/toolGovernanceCatalog.ts",
      "lib/ops/integrationsInventory.ts",
      "lib/ops/repoHygieneSummary.ts",
      "lib/ops/capabilityPresence.ts",
      "docs/internal/chief-v1-governed-loops.md",
      "docs/V1_TRUTH_MAP.md",
    ],
  };
}
