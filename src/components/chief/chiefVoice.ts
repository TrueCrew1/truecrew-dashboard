import { compareApprovalsByAge } from "./chiefApprovalUrgency";
import type { ApprovalProposal, ChiefBoardItem, ChiefResponse } from "./types";

/** Standing product line — Chief is the sole front-facing command voice. */
export const CHIEF_DEFAULT_LINE =
  "Chief is the single voice of the system. Everything passes through him. He keeps the operation moving and protects standards.";

export type ChiefDoingTone = "neutral" | "warn" | "critical" | "active";

export interface ChiefOperatorApprovalRequest {
  prompt: string;
  riskNote?: string;
  recommendation?: string;
  riskLevel?: string;
  rationale?: string;
  evidence: string[];
  nextAction?: string;
  improvementsMade: string[];
}

/**
 * Operator-facing response shape. Always Status → Recommendation → Next action,
 * then Approval request only when a gate is required.
 */
export interface ChiefOperatorView {
  status: string;
  recommendation: string;
  nextAction: string;
  approvalRequest: ChiefOperatorApprovalRequest | null;
  blockers: string[];
}

export interface ChiefDoingNow {
  label: string;
  detail: string;
  tone: ChiefDoingTone;
}

export interface ChiefOpsDeskSnapshot {
  queueCount: number;
  activeTask: string | null;
  activeTaskId: string | null;
  blocker: string | null;
  nextAction: string;
  nextActionTone: ChiefDoingTone;
}

const DEFAULT_APPROVAL_PROMPT = "This action requires your confirmation before anything executes.";

/**
 * Maps a `ChiefResponse` into the fixed operator brief format.
 * Does not invent work or bypass gates — presentation only.
 */
export function formatChiefOperatorResponse(response: ChiefResponse): ChiefOperatorView {
  const packet = response.approvalPacket;
  const approvalRequest: ChiefOperatorApprovalRequest | null = response.approvalNeeded
    ? {
        prompt: response.approvalPrompt ?? DEFAULT_APPROVAL_PROMPT,
        riskNote: response.riskNote,
        recommendation: packet?.recommendation,
        riskLevel: packet?.riskLevel,
        rationale: packet?.rationale,
        evidence: packet?.evidence ?? [],
        nextAction: packet?.nextAction,
        improvementsMade: packet?.improvementsMade ?? [],
      }
    : null;

  const nextAction =
    packet?.nextAction ??
    (response.approvalNeeded
      ? "Open Approvals and decide before anything executes."
      : response.recommendedAction);

  return {
    status: response.summary,
    recommendation: response.recommendedAction,
    nextAction,
    approvalRequest,
    blockers: response.blockers ?? [],
  };
}

/**
 * What Chief is doing right now — always visible on the ops desk.
 * Priority: routing → holding for approval → tracking blocker → monitoring.
 */
export function deriveChiefDoingNow(input: {
  isProcessing?: boolean;
  pendingApprovals: ApprovalProposal[];
  blockedItems: ChiefBoardItem[];
}): ChiefDoingNow {
  if (input.isProcessing) {
    return {
      label: "Routing",
      detail: "Working the command — no execution until you approve gated work.",
      tone: "active",
    };
  }

  const pending = [...input.pendingApprovals].sort(compareApprovalsByAge);
  const oldest = pending[0];
  if (oldest) {
    return {
      label: "Holding for approval",
      detail: oldest.title,
      tone: "critical",
    };
  }

  const blocker = input.blockedItems[0];
  if (blocker) {
    return {
      label: "Tracking blocker",
      detail: blocker.title,
      tone: "warn",
    };
  }

  return {
    label: "Monitoring queue",
    detail: "Standing by — queue clear, no blockers on the desk.",
    tone: "neutral",
  };
}

/**
 * Ops-desk strip: queue, active task, blocker, and best next action.
 */
export function deriveChiefOpsDeskSnapshot(input: {
  pendingApprovals: ApprovalProposal[];
  blockedItems: ChiefBoardItem[];
}): ChiefOpsDeskSnapshot {
  const pending = [...input.pendingApprovals].sort(compareApprovalsByAge);
  const active = pending[0] ?? null;
  const blocker = input.blockedItems[0] ?? null;

  if (active) {
    return {
      queueCount: pending.length,
      activeTask: active.title,
      activeTaskId: active.id,
      blocker: blocker?.title ?? null,
      nextAction: "Review the oldest pending approval and decide.",
      nextActionTone: "critical",
    };
  }

  if (blocker) {
    return {
      queueCount: 0,
      activeTask: null,
      activeTaskId: null,
      blocker: blocker.title,
      nextAction: `Clear blocker: ${blocker.title}.`,
      nextActionTone: "warn",
    };
  }

  return {
    queueCount: 0,
    activeTask: null,
    activeTaskId: null,
    blocker: null,
    nextAction: "Queue stable — ask Chief for a brief or check specialist load.",
    nextActionTone: "neutral",
  };
}
