import { isVaultConfigured } from "../obsidian/config.js";
import { logBuild } from "../obsidian/log.js";
import type { BuildLogEntry } from "../obsidian/types.js";
import {
  createBuilderReport,
  type BuilderReport,
  type BuilderReportStatus,
  type BuilderVerificationResult,
  type CreateBuilderReportInput,
} from "./builderReport.js";

export interface BuildApprovalReportInput {
  approvalId: string;
  summary: string;
  filesOrAreas: string[];
  branch?: string;
  prUrl?: string;
  verification: BuilderVerificationResult[];
  completedAt?: string;
}

export function buildBuilderReportFromApproval(
  input: BuildApprovalReportInput,
): BuilderReport {
  const payload: CreateBuilderReportInput = {
    id: `builder-report-${input.approvalId}`,
    sourceKind: "build_approval",
    sourceId: input.approvalId,
    summary: input.summary,
    branch: input.branch,
    prUrl: input.prUrl,
    filesOrAreas: input.filesOrAreas,
    verification: input.verification,
    completedAt: input.completedAt,
  };
  return createBuilderReport(payload);
}

function mapReportStatusToBuildLogResult(
  status: BuilderReportStatus,
): BuildLogEntry["result"] {
  if (status === "success") return "success";
  if (status === "failed") return "failure";
  return "unknown";
}

export function builderReportToBuildLogEntry(report: BuilderReport): BuildLogEntry {
  return {
    result: mapReportStatusToBuildLogResult(report.status),
    branch: report.branch,
    notes: [
      `Builder V1 report ${report.id}`,
      `Source: ${report.sourceKind} / ${report.sourceId}`,
      report.summary,
      report.prUrl ? `PR: ${report.prUrl}` : undefined,
      report.filesOrAreas.length > 0
        ? `Files/areas: ${report.filesOrAreas.join(", ")}`
        : undefined,
      `Verification: ${report.verification
        .map((item) => `${item.step}=${item.outcome}`)
        .join(", ")}`,
      `Status: ${report.status}`,
      `Completed: ${report.completedAt}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    loggedAt: new Date(report.completedAt),
  };
}

export type RecordBuilderReportResult =
  | { recorded: true; obsidianPath: string }
  | { recorded: false; reason: string };

export async function recordBuilderReport(
  report: BuilderReport,
): Promise<RecordBuilderReportResult> {
  if (!isVaultConfigured()) {
    return {
      recorded: false,
      reason: "Obsidian vault is not configured",
    };
  }

  try {
    const result = await logBuild(builderReportToBuildLogEntry(report));
    return { recorded: true, obsidianPath: result.obsidianPath };
  } catch (error) {
    return {
      recorded: false,
      reason: error instanceof Error ? error.message : "Failed to write build log",
    };
  }
}
