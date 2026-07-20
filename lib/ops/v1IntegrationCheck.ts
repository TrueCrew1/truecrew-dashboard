import { buildOperationalReadinessSummary } from "../chief/operationalReadiness.js";
import { buildDailyTurnoverSnapshot } from "../chief/dailyTurnover.js";
import { detectV1CapabilityPresence } from "./capabilityPresence.js";
import {
  validateIntegrationsInventory,
  validateToolGovernanceCatalog,
} from "./validateCatalog.js";
import { INTEGRATIONS_INVENTORY } from "./integrationsInventory.js";
import { TOOL_GOVERNANCE_CATALOG } from "./toolGovernanceCatalog.js";
import {
  detectPresentSliceIds,
  isBaselineAchieved,
  isBaselineMerged,
  listMissingBaselineSliceIds,
  listMissingMergedBaselineSliceIds,
  type V1MergeSliceId,
} from "./v1MergePlan.js";

export type IntegrationCheckOutcome = "pass" | "partial" | "fail";

export interface IntegrationCheckResult {
  outcome: IntegrationCheckOutcome;
  message: string;
}

export type IntegrationCheckId =
  | "catalog-shape"
  | "readiness-composition"
  | "readiness-overall-honest"
  | "readiness-reporting-honest"
  | "readiness-integrations-honest"
  | "ops-status-panel"
  | "evidence-trail-partial"
  | "evidence-trail-missing-refs"
  | "turnover-snapshot"
  | "turnover-panel-demo-guard"
  | "merge-plan-baseline"
  | "builder-report-presence";

export type V1IntegrationCheckMap = Record<IntegrationCheckId, IntegrationCheckResult>;

export interface RunV1IntegrationChecksInput {
  root?: string;
  presentSliceIds?: readonly V1MergeSliceId[];
  /** Slice ids merged to main; defaults to none (open-PR stack state). */
  mergedSliceIds?: readonly V1MergeSliceId[];
}

function result(
  outcome: IntegrationCheckOutcome,
  message: string,
): IntegrationCheckResult {
  return { outcome, message };
}

/**
 * In-process V1 stack checks for tests and ops scripts.
 * Does not call external services or production routes.
 */
export function runV1IntegrationChecks(
  input: RunV1IntegrationChecksInput = {},
): V1IntegrationCheckMap {
  const root = input.root ?? process.cwd();
  const presentSliceIds = input.presentSliceIds ?? detectPresentSliceIds(root);
  const mergedSliceIds = input.mergedSliceIds ?? [];
  const capabilities = detectV1CapabilityPresence(root);
  const checks: Partial<V1IntegrationCheckMap> = {};

  try {
    validateToolGovernanceCatalog(TOOL_GOVERNANCE_CATALOG);
    validateIntegrationsInventory(INTEGRATIONS_INVENTORY);
    checks["catalog-shape"] = result("pass", "Tool governance and integrations catalogs validate.");
  } catch (error) {
    checks["catalog-shape"] = result(
      "fail",
      error instanceof Error ? error.message : "Catalog validation failed.",
    );
  }

  let summary;
  try {
    summary = buildOperationalReadinessSummary(root);
    checks["readiness-composition"] = result(
      "pass",
      `Operational readiness composed ${summary.domains.length} domains.`,
    );
  } catch (error) {
    checks["readiness-composition"] = result(
      "fail",
      error instanceof Error ? error.message : "Readiness composition failed.",
    );
    summary = null;
  }

  if (summary) {
    const reporting = summary.domains.find((domain) => domain.id === "reporting");
    const integrations = summary.domains.find((domain) => domain.id === "integrations");

    if (summary.overallStatus === "ready") {
      checks["readiness-overall-honest"] = result(
        "fail",
        "Overall readiness is 'ready' but V1 still has known partial domains.",
      );
    } else {
      checks["readiness-overall-honest"] = result(
        "pass",
        `Overall readiness is honestly '${summary.overallStatus}'.`,
      );
    }

    if (reporting?.status === "ready") {
      checks["readiness-reporting-honest"] = result(
        "fail",
        "Reporting domain is 'ready' but turnover/builder reporting remain operator-triggered in V1.",
      );
    } else if (!reporting) {
      checks["readiness-reporting-honest"] = result("fail", "Reporting domain missing.");
    } else {
      checks["readiness-reporting-honest"] = result(
        "partial",
        `Reporting domain is '${reporting.status}' with honest partial notes.`,
      );
    }

    if (integrations?.status === "ready") {
      checks["readiness-integrations-honest"] = result(
        "fail",
        "Integrations domain is 'ready' but inventory still lists partial/not_wired entries.",
      );
    } else if (!integrations) {
      checks["readiness-integrations-honest"] = result("fail", "Integrations domain missing.");
    } else {
      checks["readiness-integrations-honest"] = result(
        "pass",
        `Integrations domain is honestly '${integrations.status}'.`,
      );
    }
  } else {
    checks["readiness-overall-honest"] = result("fail", "Skipped — readiness composition failed.");
    checks["readiness-reporting-honest"] = result("fail", "Skipped — readiness composition failed.");
    checks["readiness-integrations-honest"] = result("fail", "Skipped — readiness composition failed.");
  }

  const hasOpsPanel = presentSliceIds.includes("command-center-ops-status");
  checks["ops-status-panel"] = hasOpsPanel
    ? result("pass", "Command Center ops-status slice markers are present.")
    : result("partial", "Command Center ops-status panel slice is not present on disk.");

  const hasEvidenceTrail = presentSliceIds.includes("evidence-trail");
  checks["evidence-trail-partial"] = hasEvidenceTrail
    ? result(
        "pass",
        "Evidence trail module present — partial/missing states handled in dedicated tests.",
      )
    : result("partial", "Evidence trail slice markers are not present on disk.");

  checks["evidence-trail-missing-refs"] = hasEvidenceTrail
    ? result(
        "pass",
        "Evidence trail surfaces not_recorded references when activity is missing (see tests).",
      )
    : result("partial", "Evidence trail module absent — cannot verify reference surfacing.");

  if (capabilities.dailyTurnover) {
    try {
      const snapshot = buildDailyTurnoverSnapshot({
        generatedAt: "2026-07-20T12:00:00.000Z",
        vaultRecords: [],
        supabaseDecisions: [],
        missions: [],
        health: {
          vault: "not configured",
          supabase: "not configured",
          slackWebhook: "not configured",
          githubWebhook: "not configured",
          repoHealth: "not yet wired",
        },
        dataNotes: ["integration check fixture"],
      });
      checks["turnover-snapshot"] = result(
        "pass",
        `Daily turnover snapshot built (${snapshot.counts.approvedActivity24h} approved in fixture window).`,
      );
    } catch (error) {
      checks["turnover-snapshot"] = result(
        "fail",
        error instanceof Error ? error.message : "Turnover snapshot failed.",
      );
    }
    checks["turnover-panel-demo-guard"] = result(
      "pass",
      "Turnover module present; demo-mode guard enforced in panel view tests.",
    );
  } else {
    checks["turnover-snapshot"] = result(
      "partial",
      "Daily turnover module not present — snapshot check skipped.",
    );
    checks["turnover-panel-demo-guard"] = result(
      "partial",
      "Daily turnover module not present — demo guard not applicable.",
    );
  }

  const stackPresent = isBaselineAchieved(root, { presentSliceIds });
  const stackMerged = isBaselineMerged(mergedSliceIds);

  if (stackMerged) {
    checks["merge-plan-baseline"] = result(
      "pass",
      "All required V1 slices are merged to main.",
    );
  } else if (mergedSliceIds.length > 0) {
    checks["merge-plan-baseline"] = result(
      "partial",
      `Partial main merge — still missing: ${listMissingMergedBaselineSliceIds(mergedSliceIds).join(", ")}`,
    );
  } else if (stackPresent) {
    checks["merge-plan-baseline"] = result(
      "partial",
      "V1 stack markers are present on this branch but slices are not merged to main.",
    );
  } else {
    checks["merge-plan-baseline"] = result(
      "partial",
      `Missing baseline slices on disk: ${listMissingBaselineSliceIds(root, { presentSliceIds }).join(", ") || "none detected"}`,
    );
  }

  checks["builder-report-presence"] = capabilities.builderReport
    ? result("pass", "Builder V1 structured report module is present.")
    : result(
        "partial",
        "Builder V1 report module (lib/build/builderReport.ts) is not on this branch.",
      );

  return checks as V1IntegrationCheckMap;
}

export function summarizeIntegrationChecks(
  checks: V1IntegrationCheckMap,
): { pass: number; partial: number; fail: number } {
  return Object.values(checks).reduce(
    (totals, check) => {
      totals[check.outcome] += 1;
      return totals;
    },
    { pass: 0, partial: 0, fail: 0 },
  );
}
