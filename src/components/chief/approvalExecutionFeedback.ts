import type { ResearchMissionPayload } from "./researchMonitorIncidentPostmortem";
import { MONITOR_PLATFORM_APPROVAL_ID } from "./monitorApprovalCards";
import { isGovernedResearchMissionProposal } from "./researchMissionHelpers";
import type { ApprovalAction, ApprovalProposal, ApprovalStatus } from "./types";

export type ApprovalExecutionFeedbackKind =
  | "no_mission"
  | "mission_queued"
  | "mission_running"
  | "mission_completed"
  | "mission_blocked"
  | "mission_failed"
  | "mission_launch_failed"
  | "mission_waiting"
  | "mock_unavailable";

export type ApprovalExecutionFeedbackTone = "neutral" | "success" | "warn" | "error" | "info";

export interface ApprovalExecutionFeedback {
  kind: ApprovalExecutionFeedbackKind;
  message: string;
  tone: ApprovalExecutionFeedbackTone;
}

export interface DeriveApprovalExecutionFeedbackInput {
  proposal: ApprovalProposal;
  liveApiEnabled: boolean;
  mission?: ResearchMissionPayload | null;
  launchError?: string | null;
  isLaunching?: boolean;
}

function isMonitorApprovalCard(proposal: ApprovalProposal): boolean {
  return proposal.id === MONITOR_PLATFORM_APPROVAL_ID;
}

function informationalNoMissionMessage(proposal: ApprovalProposal, status: ApprovalStatus): string {
  if (isMonitorApprovalCard(proposal)) {
    return "No mission launched — informational acknowledgment only.";
  }

  if (status === "sent_back") {
    return "No mission launched — sent back for changes.";
  }

  if (status === "rejected") {
    return "No mission launched — proposal rejected.";
  }

  return "No mission launched.";
}

function missionStatusFeedback(mission: ResearchMissionPayload): ApprovalExecutionFeedback {
  switch (mission.status) {
    case "queued":
      return {
        kind: "mission_queued",
        message: "Mission queued",
        tone: "info",
      };
    case "running":
      return {
        kind: "mission_running",
        message: "Mission running",
        tone: "info",
      };
    case "completed":
      return {
        kind: "mission_completed",
        message: "Mission completed",
        tone: "success",
      };
    case "blocked": {
      const detail = mission.error?.trim();
      return {
        kind: "mission_blocked",
        message: detail ? `Mission blocked — ${detail}` : "Mission blocked",
        tone: "warn",
      };
    }
    case "failed": {
      const detail = mission.error?.trim();
      return {
        kind: "mission_failed",
        message: detail ? `Mission failed — ${detail}` : "Mission failed",
        tone: "error",
      };
    }
    default:
      return {
        kind: "mission_waiting",
        message: "Mission status unavailable",
        tone: "warn",
      };
  }
}

export function deriveApprovalExecutionFeedback(
  input: DeriveApprovalExecutionFeedbackInput,
): ApprovalExecutionFeedback | null {
  const { proposal, liveApiEnabled, mission, launchError, isLaunching } = input;

  if (proposal.status === "pending") {
    if (
      isLaunching &&
      isGovernedResearchMissionProposal(proposal) &&
      liveApiEnabled
    ) {
      return {
        kind: "mission_waiting",
        message: "Launching mission…",
        tone: "info",
      };
    }
    return null;
  }

  if (proposal.status !== "approved") {
    return {
      kind: "no_mission",
      message: informationalNoMissionMessage(proposal, proposal.status),
      tone: "neutral",
    };
  }

  if (isMonitorApprovalCard(proposal)) {
    return {
      kind: "no_mission",
      message: informationalNoMissionMessage(proposal, proposal.status),
      tone: "neutral",
    };
  }

  if (!isGovernedResearchMissionProposal(proposal)) {
    return {
      kind: "no_mission",
      message: informationalNoMissionMessage(proposal, proposal.status),
      tone: "neutral",
    };
  }

  if (!liveApiEnabled) {
    return {
      kind: "mock_unavailable",
      message: "Mission launch unavailable in mock mode.",
      tone: "neutral",
    };
  }

  if (launchError) {
    return {
      kind: "mission_launch_failed",
      message: launchError,
      tone: "error",
    };
  }

  if (mission) {
    return missionStatusFeedback(mission);
  }

  return {
    kind: "mission_waiting",
    message: "Approved — waiting for mission record.",
    tone: "warn",
  };
}

export function launchErrorFromApprovalActionMessage(
  message: string | undefined,
  action?: ApprovalAction,
): string | null {
  if (!message?.trim() || action !== "approved") return null;
  const normalized = message.toLowerCase();
  if (!normalized.includes("mission")) return null;
  return message.trim();
}

export const APPROVAL_EXECUTION_MOCK_NOTE =
  "Mission launch unavailable in mock mode.";
