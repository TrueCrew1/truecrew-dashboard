/**
 * Maps runtime ChiefResponse fields into the canonical four-line operator format
 * from docs/CHIEF_SINGLE_VOICE.md — presentation only; does not change resolvers.
 */
import type { ChiefResponse, ChiefSpecialist } from "./types";

export interface ChiefReplyLines {
  status: string;
  recommendation: string;
  nextAction: string;
  approvalRequest: string;
}

/** User-facing lane label for specialists that appear in Next action. */
export function displaySpecialistLane(specialist: ChiefSpecialist): string {
  if (specialist === "Chief") return "Chief";
  // Prompt taxonomy: Repo (code may still say Build Agent elsewhere)
  if (specialist === "Workflow Gate Agent") return "Workflow Gate";
  if (specialist === "Librarian Agent") return "Librarian";
  if (specialist === "Research Agent") return "Research";
  if (specialist === "Roadmap Agent") return "Roadmap";
  if (specialist === "Marketer Agent") return "Marketer";
  return specialist;
}

export function formatChiefApprovalRequest(response: ChiefResponse): string {
  if (!response.approvalNeeded) return "none";

  const fromPacket = response.approvalPacket?.recommendation?.trim();
  const fromPrompt = response.approvalPrompt?.trim();
  const fromTitle = response.approvalTitle?.trim();

  return fromPrompt || fromTitle || fromPacket || "Review in Chief Approvals";
}

export function formatChiefNextAction(response: ChiefResponse): string {
  const fromPacket = response.approvalPacket?.nextAction?.trim();
  if (fromPacket) return fromPacket;

  const blockers = response.blockers?.filter((b) => b.trim().length > 0) ?? [];
  if (blockers.length === 1) return blockers[0];
  if (blockers.length > 1) {
    return `${blockers[0]} (+${blockers.length - 1} more)`;
  }

  if (response.routedTo && response.routedTo !== "Chief") {
    return `Hand to ${displaySpecialistLane(response.routedTo)} — ${response.recommendedAction}`;
  }

  return response.recommendedAction;
}

export function formatChiefStatus(response: ChiefResponse): string {
  const blockers = response.blockers?.filter((b) => b.trim().length > 0) ?? [];
  if (blockers.length === 0) return response.summary;
  const suffix =
    blockers.length === 1
      ? ` Blocker: ${blockers[0]}`
      : ` ${blockers.length} blockers (see Next action).`;
  return `${response.summary}${suffix}`;
}

export function formatChiefReplyLines(response: ChiefResponse): ChiefReplyLines {
  return {
    status: formatChiefStatus(response),
    recommendation: response.recommendedAction,
    nextAction: formatChiefNextAction(response),
    approvalRequest: formatChiefApprovalRequest(response),
  };
}

/** Compact multi-line string for command history / logs. */
export function formatChiefReplyPlainText(response: ChiefResponse): string {
  const lines = formatChiefReplyLines(response);
  return [
    `Status: ${lines.status}`,
    `Recommendation: ${lines.recommendation}`,
    `Next action: ${lines.nextAction}`,
    `Approval request: ${lines.approvalRequest}`,
  ].join("\n");
}
