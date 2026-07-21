import fs from "node:fs";
import { fileURLToPath } from "node:url";

export type V1CheckStatus = "pass" | "partial" | "fail" | "not_wired";

export interface V1IntegrationCheckResult {
  id: string;
  label: string;
  status: V1CheckStatus;
  message: string;
}

export interface V1IntegrationCheckSummary {
  generatedAt: string;
  checks: V1IntegrationCheckResult[];
}

type OptionalModule =
  | { state: "loaded"; exports: Record<string, unknown> }
  | { state: "missing"; reason: string }
  | { state: "error"; reason: string };

const ACTIVE_STATUSES = new Set(["active", "ready", "wired", "pass"]);

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function normalizeToken(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function resolveModulePath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

async function loadOptionalModule(relativePath: string): Promise<OptionalModule> {
  const resolved = resolveModulePath(relativePath);
  if (!fs.existsSync(resolved)) {
    return { state: "missing", reason: `${relativePath} is missing` };
  }

  try {
    const module = (await import(relativePath)) as Record<string, unknown>;
    return { state: "loaded", exports: module };
  } catch (error) {
    return {
      state: "error",
      reason: `unable to import ${relativePath}: ${stringifyError(error)}`,
    };
  }
}

function collectProblemDomains(summary: unknown): string[] {
  if (!summary || typeof summary !== "object") {
    return [];
  }

  const data = summary as Record<string, unknown>;
  const domains = data.domains;
  if (!domains) {
    return [];
  }

  const problems: string[] = [];

  if (Array.isArray(domains)) {
    for (const domain of domains) {
      if (!domain || typeof domain !== "object") {
        continue;
      }
      const domainObject = domain as Record<string, unknown>;
      const status = normalizeToken(domainObject.status);
      if (status === "partial" || status === "blocked") {
        const label =
          typeof domainObject.id === "string"
            ? domainObject.id
            : typeof domainObject.label === "string"
              ? domainObject.label
              : "unknown-domain";
        problems.push(`${label}:${status}`);
      }
    }
    return problems;
  }

  if (typeof domains === "object") {
    for (const [key, value] of Object.entries(domains as Record<string, unknown>)) {
      if (!value || typeof value !== "object") {
        continue;
      }
      const status = normalizeToken((value as Record<string, unknown>).status);
      if (status === "partial" || status === "blocked") {
        problems.push(`${key}:${status}`);
      }
    }
  }

  return problems;
}

function collectStatusRecords(catalog: unknown): Map<string, string> {
  const output = new Map<string, string>();
  if (!Array.isArray(catalog)) {
    return output;
  }

  for (const item of catalog) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const object = item as Record<string, unknown>;
    const idCandidates = [
      object.id,
      object.key,
      object.slug,
      object.name,
      object.integrationId,
      object.toolId,
    ];
    const id = idCandidates.map(normalizeToken).find((candidate) => candidate.length > 0);
    const status = normalizeToken(object.status);
    if (id && status && !output.has(id)) {
      output.set(id, status);
    }
  }
  return output;
}

function readCatalogArray(exports: Record<string, unknown>): unknown[] {
  for (const value of Object.values(exports)) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function readRequiredSliceIds(moduleExports: Record<string, unknown>): string[] {
  const slices = moduleExports.V1_MERGE_SLICES;
  if (!Array.isArray(slices)) {
    return [];
  }

  const required: string[] = [];
  for (const slice of slices) {
    if (!slice || typeof slice !== "object") {
      continue;
    }
    const entry = slice as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id : "";
    const requiredForBaseline =
      typeof entry.requiredForBaseline === "boolean" ? entry.requiredForBaseline : true;
    if (id && requiredForBaseline) {
      required.push(id);
    }
  }
  return required;
}

function runReadinessDomainsCheck(
  readinessModule: OptionalModule,
): Promise<V1IntegrationCheckResult> | V1IntegrationCheckResult {
  if (readinessModule.state !== "loaded") {
    return {
      id: "readiness_domains",
      label: "Readiness domains",
      status: "not_wired",
      message: readinessModule.reason,
    };
  }

  const summaryBuilder = readinessModule.exports.buildOperationalReadinessSummary;
  if (typeof summaryBuilder !== "function") {
    return {
      id: "readiness_domains",
      label: "Readiness domains",
      status: "not_wired",
      message: "buildOperationalReadinessSummary is unavailable",
    };
  }

  return Promise.resolve()
    .then(() => (summaryBuilder as () => unknown)())
    .then((result) => {
      const summary = result as Record<string, unknown>;
      const overall = normalizeToken(summary.overallStatus);
      const problems = collectProblemDomains(summary);

      let status: V1CheckStatus = "partial";
      if (overall === "ready") {
        status = "pass";
      } else if (overall === "blocked") {
        status = "fail";
      } else if (overall === "partial") {
        status = "partial";
      }

      const problemSummary = problems.length > 0 ? `; problem domains: ${problems.join(", ")}` : "";
      return {
        id: "readiness_domains",
        label: "Readiness domains",
        status,
        message: `overall=${overall || "unknown"}${problemSummary}`,
      };
    })
    .catch((error) => ({
      id: "readiness_domains",
      label: "Readiness domains",
      status: "not_wired",
      message: `readiness summary failed: ${stringifyError(error)}`,
    }));
}

function runToolAndIntegrationCatalogCheck(
  toolModule: OptionalModule,
  integrationModule: OptionalModule,
): V1IntegrationCheckResult {
  if (toolModule.state !== "loaded") {
    return {
      id: "tool_and_integration_catalog",
      label: "Tool and integration catalog",
      status: "not_wired",
      message: toolModule.reason,
    };
  }
  if (integrationModule.state !== "loaded") {
    return {
      id: "tool_and_integration_catalog",
      label: "Tool and integration catalog",
      status: "not_wired",
      message: integrationModule.reason,
    };
  }

  const coreRequired = ["chief", "supabase", "vercel", "internal-api-auth"] as const;
  const toolStatuses = collectStatusRecords(readCatalogArray(toolModule.exports));
  const integrationStatuses = collectStatusRecords(readCatalogArray(integrationModule.exports));
  const allStatuses = new Map<string, string>([...toolStatuses.entries(), ...integrationStatuses.entries()]);

  const missingOrNotWired: string[] = [];
  const partial: string[] = [];
  for (const required of coreRequired) {
    const status = allStatuses.get(required);
    if (!status || status === "not-wired" || status === "not_wired") {
      missingOrNotWired.push(required);
      continue;
    }
    if (status === "partial") {
      partial.push(required);
      continue;
    }
    if (!ACTIVE_STATUSES.has(status)) {
      partial.push(`${required}:${status}`);
    }
  }

  if (missingOrNotWired.length > 0) {
    return {
      id: "tool_and_integration_catalog",
      label: "Tool and integration catalog",
      status: "fail",
      message: `required not wired: ${missingOrNotWired.join(", ")}`,
    };
  }
  if (partial.length > 0) {
    return {
      id: "tool_and_integration_catalog",
      label: "Tool and integration catalog",
      status: "partial",
      message: `required partial/mixed: ${partial.join(", ")}`,
    };
  }
  return {
    id: "tool_and_integration_catalog",
    label: "Tool and integration catalog",
    status: "pass",
    message: "required tool and integration entries are active",
  };
}

function runEvidenceTrailWiringCheck(evidenceModule: OptionalModule): V1IntegrationCheckResult {
  if (evidenceModule.state !== "loaded") {
    return {
      id: "evidence_trail_wiring",
      label: "Evidence trail wiring",
      status: "not_wired",
      message: evidenceModule.reason,
    };
  }

  const exportKeys = Object.keys(evidenceModule.exports);
  if (exportKeys.length === 0) {
    return {
      id: "evidence_trail_wiring",
      label: "Evidence trail wiring",
      status: "not_wired",
      message: "module exports are empty",
    };
  }

  const serialized = JSON.stringify(evidenceModule.exports).toLowerCase();
  if (serialized.includes("not_wired") || serialized.includes("not-wired")) {
    return {
      id: "evidence_trail_wiring",
      label: "Evidence trail wiring",
      status: "partial",
      message: "module loads, but at least one evidence facet is marked not_wired",
    };
  }
  if (serialized.includes("placeholder")) {
    return {
      id: "evidence_trail_wiring",
      label: "Evidence trail wiring",
      status: "partial",
      message: "module loads, but placeholder markers remain",
    };
  }
  return {
    id: "evidence_trail_wiring",
    label: "Evidence trail wiring",
    status: "pass",
    message: "module imports and exports non-placeholder evidence constructs",
  };
}

async function runDailyTurnoverCapabilityCheck(
  collectModule: OptionalModule,
  turnoverModule: OptionalModule,
): Promise<V1IntegrationCheckResult> {
  if (collectModule.state !== "loaded") {
    return {
      id: "daily_turnover_capability",
      label: "Daily turnover capability",
      status: "not_wired",
      message: collectModule.reason,
    };
  }

  const collectSnapshot = collectModule.exports.collectDailyTurnoverSnapshot;
  if (typeof collectSnapshot !== "function") {
    return {
      id: "daily_turnover_capability",
      label: "Daily turnover capability",
      status: "not_wired",
      message: "collectDailyTurnoverSnapshot is unavailable",
    };
  }

  try {
    const result = await (collectSnapshot as (input?: unknown) => unknown)(
      (collectSnapshot as { length: number }).length > 0 ? {} : undefined,
    );
    const plausibleSummary = !!result && typeof result === "object";
    const slackConfigured = Boolean(process.env.SLACK_WEBHOOK_URL);
    const turnoverModuleLoaded = turnoverModule.state === "loaded";

    if (!plausibleSummary) {
      return {
        id: "daily_turnover_capability",
        label: "Daily turnover capability",
        status: "partial",
        message: "snapshot call completed but did not return an object summary",
      };
    }

    if (!turnoverModuleLoaded || !slackConfigured) {
      const slackReason = !turnoverModuleLoaded
        ? "dailyTurnover module missing"
        : "SLACK_WEBHOOK_URL is not configured";
      return {
        id: "daily_turnover_capability",
        label: "Daily turnover capability",
        status: "partial",
        message: `snapshot generated; ${slackReason}`,
      };
    }

    return {
      id: "daily_turnover_capability",
      label: "Daily turnover capability",
      status: "pass",
      message: "snapshot generated and Slack webhook is configured",
    };
  } catch (error) {
    return {
      id: "daily_turnover_capability",
      label: "Daily turnover capability",
      status: "not_wired",
      message: `snapshot generation failed: ${stringifyError(error)}`,
    };
  }
}

function runBuilderReportCapabilityCheck(builderModule: OptionalModule): V1IntegrationCheckResult {
  if (builderModule.state !== "loaded") {
    return {
      id: "builder_report_capability",
      label: "Builder report capability",
      status: "not_wired",
      message: builderModule.reason,
    };
  }

  const candidateFactories = Object.entries(builderModule.exports).filter(
    ([key, value]) => typeof value === "function" && /builder.*report|report.*builder/i.test(key),
  );

  if (candidateFactories.length === 0) {
    return {
      id: "builder_report_capability",
      label: "Builder report capability",
      status: "partial",
      message: "module loads but no report factory-like export was found",
    };
  }

  const fixture = {
    id: "integration-check-fixture",
    generatedAt: new Date(0).toISOString(),
    summary: "fixture",
    items: [],
  };

  for (const [name, candidate] of candidateFactories) {
    try {
      const value = (candidate as (input?: unknown) => unknown)(
        (candidate as { length: number }).length > 0 ? fixture : undefined,
      );
      const result = value && typeof (value as Promise<unknown>).then === "function" ? null : value;
      if (result && typeof result === "object") {
        return {
          id: "builder_report_capability",
          label: "Builder report capability",
          status: "pass",
          message: `constructed via ${name}`,
        };
      }
      if (result !== null) {
        return {
          id: "builder_report_capability",
          label: "Builder report capability",
          status: "partial",
          message: `${name} returned a non-object value`,
        };
      }
    } catch {
      // Try additional candidates before returning partial.
    }
  }

  return {
    id: "builder_report_capability",
    label: "Builder report capability",
    status: "partial",
    message: "module loads, but no factory accepted a minimal fixture",
  };
}

function runMergePlanBaselineCheck(mergePlanModule: OptionalModule): V1IntegrationCheckResult {
  if (mergePlanModule.state !== "loaded") {
    return {
      id: "merge_plan_baseline",
      label: "Merge plan baseline",
      status: "not_wired",
      message: mergePlanModule.reason,
    };
  }

  const isBaselineAchieved = mergePlanModule.exports.isBaselineAchieved;
  const requiredIds = readRequiredSliceIds(mergePlanModule.exports);
  if (typeof isBaselineAchieved !== "function" || requiredIds.length === 0) {
    return {
      id: "merge_plan_baseline",
      label: "Merge plan baseline",
      status: "fail",
      message: "baseline helper or required merge slices are unavailable",
    };
  }

  const placeholderMerged = requiredIds.length > 1 ? [requiredIds[0]] : [];
  const missing = requiredIds.filter((id) => !placeholderMerged.includes(id));

  try {
    const achieved = Boolean((isBaselineAchieved as (mergedIds: string[]) => unknown)(placeholderMerged));
    if (achieved || missing.length === 0) {
      return {
        id: "merge_plan_baseline",
        label: "Merge plan baseline",
        status: "fail",
        message: "placeholder merged slice set unexpectedly meets baseline",
      };
    }
  } catch (error) {
    return {
      id: "merge_plan_baseline",
      label: "Merge plan baseline",
      status: "fail",
      message: `baseline evaluator failed for placeholder set: ${stringifyError(error)}`,
    };
  }

  return {
    id: "merge_plan_baseline",
    label: "Merge plan baseline",
    status: "partial",
    message: `baseline pending; missing required slices: ${missing.join(", ")}`,
  };
}

export async function runV1IntegrationChecks(): Promise<V1IntegrationCheckSummary> {
  const [
    readinessModule,
    toolCatalogModule,
    integrationCatalogModule,
    evidenceModule,
    collectTurnoverModule,
    dailyTurnoverModule,
    builderReportModule,
    mergePlanModule,
  ] = await Promise.all([
    loadOptionalModule("../chief/operationalReadiness.ts"),
    loadOptionalModule("./toolGovernanceCatalog.ts"),
    loadOptionalModule("./integrationsInventory.ts"),
    loadOptionalModule("../chief/governedEvidenceTrail.ts"),
    loadOptionalModule("../chief/collectDailyTurnoverSnapshot.ts"),
    loadOptionalModule("../chief/dailyTurnover.ts"),
    loadOptionalModule("../build/builderReport.ts"),
    loadOptionalModule("./v1MergePlan.ts"),
  ]);

  const readinessResult = await runReadinessDomainsCheck(readinessModule);
  const checks: V1IntegrationCheckResult[] = [
    readinessResult,
    runToolAndIntegrationCatalogCheck(toolCatalogModule, integrationCatalogModule),
    runEvidenceTrailWiringCheck(evidenceModule),
    await runDailyTurnoverCapabilityCheck(collectTurnoverModule, dailyTurnoverModule),
    runBuilderReportCapabilityCheck(builderReportModule),
    runMergePlanBaselineCheck(mergePlanModule),
  ];

  return {
    generatedAt: new Date().toISOString(),
    checks,
  };
}
