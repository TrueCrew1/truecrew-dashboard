import type {
  ApprovalProposal,
  ChiefResponse,
  CommandHistoryEntry,
  CommandHistoryStatus,
} from "./types";
import {
  GITHUB_PR_COMMENT_DRAFT_KIND,
  OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
  RESEARCH_ASSIGNMENT_DISPATCH_KIND,
} from "./types";
import { attachResearchAssignmentProposalId } from "./chiefResearchAssignment";
import { formatChiefReplyPlainText } from "./chiefReplyFormat";

export function nextChiefId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Deterministic ID for content-derived proposals (FNV-1a hash of seed).
 * The same command always produces the same proposal ID, so persisted
 * approval decisions survive reloads instead of orphaning against a
 * random UUID that never reappears.
 */
export function stableChiefId(prefix: string, seed: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}-${hash.toString(16).padStart(8, "0")}`;
}

export function formatChiefTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today ${time}`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildHistoryEntry(
  command: string,
  response: ChiefResponse,
  status: CommandHistoryStatus = "completed",
): CommandHistoryEntry {
  return {
    id: nextChiefId("cmd"),
    command,
    timestamp: new Date().toISOString(),
    resultSummary: formatChiefReplyPlainText(response),
    status,
  };
}

export function buildApprovalFromResponse(
  command: string,
  response: ChiefResponse,
): ApprovalProposal | null {
  if (!response.approvalNeeded) return null;

  const obsidianDraft = response.obsidianNoteDraft;
  const githubDraft = response.githubPrCommentDraft;
  const researchAssignment = response.researchAssignment;

  if (obsidianDraft) {
    return {
      id: stableChiefId("apr-cmd", `${command}|${response.approvalTitle ?? ""}`),
      title: response.approvalTitle ?? `Approval: ${command.slice(0, 48)}`,
      summary: response.summary,
      recommendedAction: response.recommendedAction,
      riskNote: response.riskNote ?? "Review recommended action before approving.",
      status: "pending",
      createdAt: new Date().toISOString(),
      specialist:
        response.routedTo !== "Chief"
          ? response.routedTo
          : response.specialists?.[0]?.specialist,
      missionKind: OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
      missionProjectId: obsidianDraft.projectId,
      obsidianNoteDraft: obsidianDraft,
      source: "ops_change",
      recommendedDecision: "approve",
      checklist: [
        { label: "Target path is inside project Obsidian scope", status: "pass" },
        { label: "Draft reviewed (title + preview)", status: "pending" },
        { label: "Vault write only after approve", status: "pending" },
      ],
    };
  }

  if (githubDraft) {
    const target = `${githubDraft.repo}#${githubDraft.prNumber}`;
    return {
      id: stableChiefId("apr-cmd", `${command}|${response.approvalTitle ?? ""}`),
      title: response.approvalTitle ?? `Approval: ${command.slice(0, 48)}`,
      summary: response.summary,
      recommendedAction: response.recommendedAction,
      riskNote: response.riskNote ?? "Review recommended action before approving.",
      status: "pending",
      createdAt: new Date().toISOString(),
      specialist:
        response.routedTo !== "Chief"
          ? response.routedTo
          : response.specialists?.[0]?.specialist,
      missionKind: GITHUB_PR_COMMENT_DRAFT_KIND,
      missionProjectId: githubDraft.projectId,
      githubPrCommentDraft: githubDraft,
      source: "ops_change",
      recommendedDecision: "approve",
      checklist: [
        { label: `PR ${target} is inside project GitHub scope`, status: "pass" },
        { label: "Comment draft reviewed", status: "pending" },
        { label: "GitHub post only after approve (no merge/close)", status: "pending" },
      ],
    };
  }

  if (researchAssignment) {
    const proposalId = stableChiefId(
      "apr-cmd",
      `${command}|${response.approvalTitle ?? ""}|${researchAssignment.id}`,
    );
    attachResearchAssignmentProposalId(researchAssignment, proposalId);
    return {
      id: proposalId,
      title: response.approvalTitle ?? `Approval: ${command.slice(0, 48)}`,
      summary: response.summary,
      recommendedAction: response.recommendedAction,
      riskNote: response.riskNote ?? "Review recommended action before approving.",
      status: "pending",
      createdAt: new Date().toISOString(),
      specialist:
        response.routedTo !== "Chief"
          ? response.routedTo
          : response.specialists?.[0]?.specialist,
      missionKind: RESEARCH_ASSIGNMENT_DISPATCH_KIND,
      missionProjectId: researchAssignment.projectId,
      researchAssignment,
      source: "ops_change",
      recommendedDecision: "approve",
      checklist: [
        { label: "Assignment scoped to selected project", status: "pass" },
        { label: "Research lane and requested output reviewed", status: "pending" },
        { label: "Send only after approve (local_controlled)", status: "pending" },
      ],
    };
  }

  return {
    id: stableChiefId("apr-cmd", `${command}|${response.approvalTitle ?? ""}`),
    title: response.approvalTitle ?? `Approval: ${command.slice(0, 48)}`,
    summary: response.summary,
    recommendedAction: response.recommendedAction,
    riskNote: response.riskNote ?? "Review recommended action before approving.",
    status: "pending",
    createdAt: new Date().toISOString(),
    specialist:
      response.routedTo !== "Chief"
        ? response.routedTo
        : response.specialists?.[0]?.specialist,
  };
}
