export type BuilderVerificationStep = "build" | "test" | "lint";

export type BuilderVerificationOutcome = "pass" | "fail" | "skipped" | "not_run";

export type BuilderReportStatus = "success" | "failed" | "partial";

export type BuilderReportSourceKind =
  | "build_approval"
  | "project_handoff"
  | "manual";

export interface BuilderVerificationResult {
  step: BuilderVerificationStep;
  outcome: BuilderVerificationOutcome;
  detail?: string;
}

export interface BuilderReport {
  id: string;
  sourceKind: BuilderReportSourceKind;
  sourceId: string;
  summary: string;
  branch?: string;
  prUrl?: string;
  filesOrAreas: string[];
  verification: BuilderVerificationResult[];
  status: BuilderReportStatus;
  completedAt: string;
}

export interface CreateBuilderReportInput {
  id: string;
  sourceKind: BuilderReportSourceKind;
  sourceId: string;
  summary: string;
  branch?: string;
  prUrl?: string;
  filesOrAreas?: string[];
  verification: BuilderVerificationResult[];
  completedAt?: string;
}

const REQUIRED_STEPS: BuilderVerificationStep[] = ["build", "test", "lint"];

export function deriveBuilderReportStatus(
  verification: readonly BuilderVerificationResult[],
): BuilderReportStatus {
  const byStep = new Map(verification.map((item) => [item.step, item.outcome]));

  if (REQUIRED_STEPS.some((step) => byStep.get(step) === "fail")) {
    return "failed";
  }

  const hasIncomplete = REQUIRED_STEPS.some((step) => {
    const outcome = byStep.get(step);
    return outcome === undefined || outcome === "not_run" || outcome === "skipped";
  });

  if (hasIncomplete) {
    return "partial";
  }

  return "success";
}

export function createBuilderReport(input: CreateBuilderReportInput): BuilderReport {
  const verification = [...input.verification];
  return {
    id: input.id,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    summary: input.summary.trim(),
    branch: input.branch?.trim() || undefined,
    prUrl: input.prUrl?.trim() || undefined,
    filesOrAreas: [...(input.filesOrAreas ?? [])],
    verification,
    status: deriveBuilderReportStatus(verification),
    completedAt: input.completedAt ?? new Date().toISOString(),
  };
}

export function formatBuilderReportSummary(report: BuilderReport): string {
  const verificationLines = report.verification.map(
    (item) =>
      `${item.step}: ${item.outcome}${item.detail ? ` (${item.detail})` : ""}`,
  );

  return [
    `Builder report ${report.id} — ${report.status}`,
    `Source: ${report.sourceKind} / ${report.sourceId}`,
    report.summary,
    report.branch ? `Branch: ${report.branch}` : null,
    report.prUrl ? `PR: ${report.prUrl}` : null,
    report.filesOrAreas.length > 0
      ? `Files/areas: ${report.filesOrAreas.join(", ")}`
      : null,
    `Verification: ${verificationLines.join("; ")}`,
    `Completed: ${report.completedAt}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
