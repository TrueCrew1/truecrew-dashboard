import type { ApprovalActivityRecord } from "../../../lib/approvals/types";
import {
  deriveApprovalExecutionFeedback,
  type ApprovalExecutionFeedback,
} from "@/components/chief/approvalExecutionFeedback";
import {
  deriveApprovalResultLinks,
  type ApprovalResultLink,
} from "@/components/chief/approvalResultLinks";
import { isGovernedResearchMissionProposal } from "@/components/chief/researchMissionHelpers";
import type { ResearchMissionPayload } from "@/components/chief/researchMonitorIncidentPostmortem";
import { MONITOR_PLATFORM_APPROVAL_ID } from "@/components/chief/monitorApprovalCards";
import type { ApprovalProposal, ApprovalStatus } from "@/components/chief/types";

export type EvidenceSourceKind = "approval" | "mission";

export type EvidenceAvailability = "recorded" | "partial" | "not_recorded" | "not_wired";

export type EvidenceTrailStatus = "complete" | "partial" | "pending" | "unavailable";

export type EvidenceVerificationStepName = "build" | "test" | "lint";

export interface EvidenceVerificationStep {
  step: EvidenceVerificationStepName;
  availability: EvidenceAvailability;
  outcome?: "pass" | "fail" | "skipped" | "not_run";
  detail?: string;
}

export type EvidenceReferenceKind =
  | "artifact"
  | "log"
  | "doc"
  | "activity"
  | "report";

export interface EvidenceReference {
  label: string;
  path: string;
  availability: EvidenceAvailability;
  kind: EvidenceReferenceKind;
}

export interface EvidenceReportingTrace {
  turnover: EvidenceAvailability;
  builderReport: EvidenceAvailability;
  detail?: string;
}

export interface EvidenceWarning {
  code: string;
  message: string;
}

export interface GovernedEvidenceTrail {
  sourceKind: EvidenceSourceKind;
  sourceId: string;
  title: string;
  summary: string;
  status: EvidenceTrailStatus;
  approvalStatus: ApprovalStatus;
  approvalDecidedAt?: string;
  approvalActor?: string | null;
  missionState?: string;
  missionKind?: string;
  executionFeedback: ApprovalExecutionFeedback | null;
  verification: EvidenceVerificationStep[];
  references: EvidenceReference[];
  reporting: EvidenceReportingTrace;
  warnings: EvidenceWarning[];
}

export interface EvidenceCapabilityPresence {
  builderReportModule: boolean;
  dailyTurnoverModule: boolean;
  governedSlackModule: boolean;
}

export const DEFAULT_EVIDENCE_CAPABILITIES: EvidenceCapabilityPresence = {
  builderReportModule: false,
  dailyTurnoverModule: true,
  governedSlackModule: true,
};

export interface BuilderReportEvidenceInput {
  status: "success" | "failed" | "partial";
  verification: Array<{
    step: EvidenceVerificationStepName;
    outcome: "pass" | "fail" | "skipped" | "not_run";
    detail?: string;
  }>;
  summary?: string;
  completedAt?: string;
}

export interface BuildGovernedEvidenceTrailInput {
  proposal: ApprovalProposal;
  liveApiEnabled: boolean;
  mission?: ResearchMissionPayload | null;
  launchError?: string | null;
  isLaunching?: boolean;
  activityRecord?: ApprovalActivityRecord | null;
  builderReport?: BuilderReportEvidenceInput | null;
  capabilities?: Partial<EvidenceCapabilityPresence>;
}

const GOVERNED_LOOPS_DOC = "docs/internal/chief-v1-governed-loops.md";
const TRUTH_MAP_DOC = "docs/V1_TRUTH_MAP.md";

function approvalActivityPath(proposalId: string): string {
  return `Operations/Approvals/activity/${proposalId}.json`;
}

function mergeCapabilities(
  overrides?: Partial<EvidenceCapabilityPresence>,
): EvidenceCapabilityPresence {
  return {
    ...DEFAULT_EVIDENCE_CAPABILITIES,
    ...overrides,
  };
}

function mapVerificationAvailability(
  outcome: "pass" | "fail" | "skipped" | "not_run",
): EvidenceAvailability {
  return outcome === "not_run" ? "not_recorded" : "recorded";
}

function buildVerificationSteps(
  builderReport: BuilderReportEvidenceInput | null | undefined,
  capabilities: EvidenceCapabilityPresence,
): EvidenceVerificationStep[] {
  if (builderReport) {
    return builderReport.verification.map((item) => ({
      step: item.step,
      availability: mapVerificationAvailability(item.outcome),
      outcome: item.outcome,
      detail: item.detail,
    }));
  }

  if (!capabilities.builderReportModule) {
    return (["build", "test", "lint"] as const).map((step) => ({
      step,
      availability: "not_wired" as const,
    }));
  }

  return (["build", "test", "lint"] as const).map((step) => ({
    step,
    availability: "not_recorded" as const,
    outcome: "not_run" as const,
  }));
}

function buildReportingTrace(capabilities: EvidenceCapabilityPresence): EvidenceReportingTrace {
  const turnover = capabilities.dailyTurnoverModule ? "partial" : "not_wired";
  const builderReport = capabilities.builderReportModule ? "partial" : "not_wired";

  let detail: string | undefined;
  if (capabilities.governedSlackModule && !capabilities.dailyTurnoverModule) {
    detail = "Governed Slack notifications are wired; daily turnover module is not on this branch.";
  }

  return { turnover, builderReport, detail };
}

function referenceFromResultLink(link: ApprovalResultLink): EvidenceReference {
  let kind: EvidenceReferenceKind = "artifact";
  if (link.label.toLowerCase().includes("log")) kind = "log";
  if (link.label.toLowerCase().includes("mission")) kind = "activity";

  return {
    label: link.label,
    path: link.path,
    availability: "recorded",
    kind,
  };
}

function buildReferences(input: {
  proposal: ApprovalProposal;
  resultLinks: ApprovalResultLink[];
  activityRecord?: ApprovalActivityRecord | null;
  liveApiEnabled: boolean;
  builderReport?: BuilderReportEvidenceInput | null;
}): EvidenceReference[] {
  const references: EvidenceReference[] = [
    {
      label: "Governed loops doc",
      path: GOVERNED_LOOPS_DOC,
      availability: "recorded",
      kind: "doc",
    },
    {
      label: "V1 truth map",
      path: TRUTH_MAP_DOC,
      availability: "recorded",
      kind: "doc",
    },
  ];

  if (input.activityRecord) {
    references.push({
      label: "Approval activity record",
      path: approvalActivityPath(input.proposal.id),
      availability: "recorded",
      kind: "activity",
    });
  } else if (input.liveApiEnabled && input.proposal.status !== "pending") {
    references.push({
      label: "Approval activity record",
      path: approvalActivityPath(input.proposal.id),
      availability: "not_recorded",
      kind: "activity",
    });
  }

  for (const link of input.resultLinks) {
    references.push(referenceFromResultLink(link));
  }

  if (input.builderReport) {
    references.push({
      label: "Builder report",
      path: `builder-report:${input.proposal.id}`,
      availability: input.builderReport.status === "success" ? "recorded" : "partial",
      kind: "report",
    });
  }

  return references;
}

function buildWarnings(input: {
  proposal: ApprovalProposal;
  liveApiEnabled: boolean;
  mission?: ResearchMissionPayload | null;
  executionFeedback: ApprovalExecutionFeedback | null;
  activityRecord?: ApprovalActivityRecord | null;
  capabilities: EvidenceCapabilityPresence;
}): EvidenceWarning[] {
  const warnings: EvidenceWarning[] = [];

  if (!input.liveApiEnabled) {
    warnings.push({
      code: "mock_mode",
      message: "Demo mode — mission artifacts and vault activity are not persisted.",
    });
  }

  if (input.proposal.status === "pending") {
    warnings.push({
      code: "pending_approval",
      message: "Approval decision not recorded yet.",
    });
  }

  if (
    input.proposal.status === "approved" &&
    isGovernedResearchMissionProposal(input.proposal) &&
    input.liveApiEnabled &&
    !input.mission
  ) {
    warnings.push({
      code: "mission_missing",
      message: "Approved governed mission has no mission record yet.",
    });
  }

  if (input.executionFeedback?.kind === "mission_blocked") {
    warnings.push({
      code: "mission_blocked",
      message: input.executionFeedback.message,
    });
  }

  if (input.executionFeedback?.kind === "mission_failed") {
    warnings.push({
      code: "mission_failed",
      message: input.executionFeedback.message,
    });
  }

  if (
    input.liveApiEnabled &&
    input.proposal.status !== "pending" &&
    !input.activityRecord
  ) {
    warnings.push({
      code: "activity_not_recorded",
      message: "Vault approval activity record not found for this proposal.",
    });
  }

  if (!input.capabilities.builderReportModule) {
    warnings.push({
      code: "builder_report_not_wired",
      message: "Builder V1 structured report module is not present on this branch.",
    });
  }

  return warnings;
}

function deriveTrailStatus(input: {
  proposal: ApprovalProposal;
  liveApiEnabled: boolean;
  mission?: ResearchMissionPayload | null;
  executionFeedback: ApprovalExecutionFeedback | null;
  references: EvidenceReference[];
  warnings: EvidenceWarning[];
}): EvidenceTrailStatus {
  if (!input.liveApiEnabled) return "unavailable";
  if (input.proposal.status === "pending") return "pending";

  if (input.proposal.status !== "approved") {
    return "complete";
  }

  if (input.proposal.id === MONITOR_PLATFORM_APPROVAL_ID) {
    return "complete";
  }

  if (!isGovernedResearchMissionProposal(input.proposal)) {
    return input.references.some((ref) => ref.availability === "recorded" && ref.kind !== "doc")
      ? "partial"
      : "complete";
  }

  if (!input.mission) return "partial";
  if (input.mission.status === "completed") {
    const hasArtifact = input.references.some(
      (ref) => ref.kind === "artifact" && ref.availability === "recorded",
    );
    return hasArtifact ? "complete" : "partial";
  }

  if (input.mission.status === "blocked" || input.mission.status === "failed") {
    return "partial";
  }

  return "partial";
}

export function isGovernedEvidenceTrailCandidate(
  proposal: Pick<ApprovalProposal, "id" | "missionKind" | "missionProjectId" | "status">,
): boolean {
  return (
    proposal.status !== "pending" ||
    isGovernedResearchMissionProposal(proposal) ||
    proposal.id === MONITOR_PLATFORM_APPROVAL_ID
  );
}

export function buildGovernedEvidenceTrail(
  input: BuildGovernedEvidenceTrailInput,
): GovernedEvidenceTrail {
  const capabilities = mergeCapabilities(input.capabilities);
  const executionFeedback = deriveApprovalExecutionFeedback({
    proposal: input.proposal,
    liveApiEnabled: input.liveApiEnabled,
    mission: input.mission,
    launchError: input.launchError,
    isLaunching: input.isLaunching,
  });
  const resultLinks = deriveApprovalResultLinks({
    mission: input.mission,
    missionKind: input.proposal.missionKind,
    liveApiEnabled: input.liveApiEnabled,
  });
  const verification = buildVerificationSteps(input.builderReport, capabilities);
  const reporting = buildReportingTrace(capabilities);
  const references = buildReferences({
    proposal: input.proposal,
    resultLinks,
    activityRecord: input.activityRecord,
    liveApiEnabled: input.liveApiEnabled,
    builderReport: input.builderReport,
  });
  const warnings = buildWarnings({
    proposal: input.proposal,
    liveApiEnabled: input.liveApiEnabled,
    mission: input.mission,
    executionFeedback,
    activityRecord: input.activityRecord,
    capabilities,
  });
  const status = deriveTrailStatus({
    proposal: input.proposal,
    liveApiEnabled: input.liveApiEnabled,
    mission: input.mission,
    executionFeedback,
    references,
    warnings,
  });

  return {
    sourceKind: input.mission ? "mission" : "approval",
    sourceId: input.mission?.id ?? input.proposal.id,
    title: input.proposal.title,
    summary: input.proposal.summary,
    status,
    approvalStatus: input.proposal.status,
    approvalDecidedAt: input.proposal.decidedAt ?? input.activityRecord?.decidedAt,
    approvalActor: input.proposal.decidedBy ?? input.activityRecord?.actor ?? null,
    missionState: input.mission?.status,
    missionKind: input.proposal.missionKind ?? input.mission?.kind,
    executionFeedback,
    verification,
    references,
    reporting,
    warnings,
  };
}

export function formatEvidenceAvailability(value: EvidenceAvailability): string {
  switch (value) {
    case "recorded":
      return "Recorded";
    case "partial":
      return "Partial";
    case "not_recorded":
      return "Not recorded";
    case "not_wired":
      return "Not wired";
  }
}

export function evidenceTrailStatusLabel(status: EvidenceTrailStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    case "pending":
      return "Pending";
    case "unavailable":
      return "Unavailable";
  }
}
