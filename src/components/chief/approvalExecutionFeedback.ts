import type { ResearchMissionPayload } from "./researchMonitorIncidentPostmortem";
import { MONITOR_PLATFORM_APPROVAL_ID } from "./monitorApprovalCards";
import { isGovernedResearchMissionProposal } from "./researchMissionHelpers";
import {
  formatProjectToolMutationMessage,
  getProjectToolMutationAudit,
  isProjectToolDraftProposal,
  type ChiefProjectToolMutationAudit,
} from "./chiefProjectToolMutation";
import { isResearchAssignmentDispatchProposal } from "./researchAssignmentDispatch";
import {
  RESEARCH_RESULT_SOURCE_LABEL,
  formatResearchAssignmentAuditNote,
  resolveLiveResearchAssignmentFromProposal,
} from "./researchAssignmentView";
import {
  RESEARCH_ASSIGNMENT_STATUS_LABEL,
} from "@/lib/chief/researchAssignment";
import type { ApprovalAction, ApprovalProposal, ApprovalStatus } from "./types";
import {
  GITHUB_PR_COMMENT_DRAFT_KIND,
  OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
} from "./types";

export type ApprovalExecutionFeedbackKind =
  | "no_mission"
  | "mission_queued"
  | "mission_running"
  | "mission_completed"
  | "mission_blocked"
  | "mission_failed"
  | "mission_launch_failed"
  | "mission_waiting"
  | "mock_unavailable"
  | "tool_mutation_executed"
  | "tool_mutation_skipped"
  | "tool_mutation_failed"
  | "tool_mutation_duplicate"
  | "tool_mutation_pending"
  | "research_assignment_ready"
  | "research_assignment_sent"
  | "research_assignment_completed"
  | "research_assignment_failed";

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
  /** Session audit from project-tool draft write/post (Obsidian / GitHub). */
  projectToolMutation?: ChiefProjectToolMutationAudit | null;
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

function projectToolDraftPendingMessage(proposal: ApprovalProposal): string {
  if (proposal.missionKind === OBSIDIAN_PROJECT_NOTE_DRAFT_KIND) {
    return "Draft ready — approve to write the Obsidian note under project scope.";
  }
  if (proposal.missionKind === GITHUB_PR_COMMENT_DRAFT_KIND) {
    return "Draft ready — approve to post the GitHub PR comment under project scope.";
  }
  return "Draft ready — approval required before execution.";
}

function feedbackFromProjectToolAudit(
  audit: ChiefProjectToolMutationAudit,
): ApprovalExecutionFeedback {
  const message = formatProjectToolMutationMessage(audit);
  switch (audit.outcome) {
    case "executed":
      return { kind: "tool_mutation_executed", message, tone: "success" };
    case "skipped_offline":
      return { kind: "tool_mutation_skipped", message, tone: "neutral" };
    case "failed":
      return { kind: "tool_mutation_failed", message, tone: "error" };
    case "duplicate_skipped":
      return { kind: "tool_mutation_duplicate", message, tone: "warn" };
  }
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
  const projectToolMutation =
    input.projectToolMutation ?? getProjectToolMutationAudit(proposal.id);

  if (isResearchAssignmentDispatchProposal(proposal)) {
    const live =
      resolveLiveResearchAssignmentFromProposal(proposal) ?? proposal.researchAssignment!;
    if (proposal.status === "pending") {
      return {
        kind: "research_assignment_ready",
        message: isLaunching
          ? "Approving — preparing research dispatch…"
          : `Research assignment ready — approve to send “${live.topic}” (local_controlled; no live backend).`,
        tone: "info",
      };
    }
    if (proposal.status !== "approved") {
      return {
        kind: "no_mission",
        message:
          proposal.status === "rejected"
            ? "Rejected — research assignment was not sent."
            : "Sent back — research assignment was not sent.",
        tone: "neutral",
      };
    }
    if (live.status === "completed") {
      return {
        kind: "research_assignment_completed",
        message: live.result
          ? `Workflow complete — ${RESEARCH_RESULT_SOURCE_LABEL[live.result.source]}.`
          : formatResearchAssignmentAuditNote(live),
        tone: "success",
      };
    }
    if (live.status === "failed") {
      return {
        kind: "research_assignment_failed",
        message: live.error ?? "Research assignment failed.",
        tone: "error",
      };
    }
    if (live.status === "sent") {
      return {
        kind: "research_assignment_sent",
        message:
          "Sent (local_controlled). No live researcher backend ran — record a controlled result to close the workflow.",
        tone: "success",
      };
    }
    return {
      kind: "research_assignment_ready",
      message: `Approved — assignment status ${RESEARCH_ASSIGNMENT_STATUS_LABEL[live.status]}.`,
      tone: "warn",
    };
  }

  if (isProjectToolDraftProposal(proposal)) {
    if (proposal.status === "pending") {
      if (isLaunching) {
        return {
          kind: "tool_mutation_pending",
          message: "Approving — preparing project tool execution…",
          tone: "info",
        };
      }
      return {
        kind: "tool_mutation_pending",
        message: projectToolDraftPendingMessage(proposal),
        tone: "info",
      };
    }

    if (proposal.status !== "approved") {
      return {
        kind: "no_mission",
        message:
          proposal.status === "rejected"
            ? "Rejected — draft was not written or posted."
            : "Sent back — draft was not written or posted.",
        tone: "neutral",
      };
    }

    if (projectToolMutation) {
      return feedbackFromProjectToolAudit(projectToolMutation);
    }

    if (isLaunching) {
      return {
        kind: "tool_mutation_pending",
        message: "Approved — executing project tool action…",
        tone: "info",
      };
    }

    return {
      kind: "tool_mutation_pending",
      message: liveApiEnabled
        ? "Approved — waiting for project tool execution result."
        : "Approved — live API off; execution will report skip if re-run in this session.",
      tone: "warn",
    };
  }

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
