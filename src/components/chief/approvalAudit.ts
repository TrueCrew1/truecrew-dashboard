import type { Persona } from "@/types";
import {
  APPROVAL_STATUS_BADGE,
  APPROVAL_STATUS_LABEL,
  resolvedApprovalMessage,
} from "./chiefApproval";
import { formatChiefTimestamp } from "./chiefMock";
import {
  formatProjectToolMutationMessage,
  getProjectToolMutationAudit,
} from "./chiefProjectToolMutation";
import { formatResearchAssignmentAuditNote, resolveLiveResearchAssignmentFromProposal } from "./researchAssignmentView";
import type { ApprovalAction, ApprovalProposal, ApprovalStatus } from "./types";
import {
  GITHUB_PR_COMMENT_DRAFT_KIND,
  OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
  RESEARCH_ASSIGNMENT_DISPATCH_KIND,
} from "./types";

export const APPROVAL_AUDIT_FALLBACK = {
  actor: "Unknown actor",
  target: "Unknown item",
  context: "No context recorded",
  note: "No note recorded",
  timestamp: "Time not recorded",
} as const;

export interface ApprovalAuditEntry {
  id: string;
  action: ApprovalAction;
  actionLabel: string;
  actorLabel: string;
  timestamp: string;
  timestampIso: string | null;
  targetTitle: string;
  contextLabel: string;
  note: string | null;
  badgeClass: string;
}

function formatActorLabel(actor?: Persona | null): string {
  if (!actor) return APPROVAL_AUDIT_FALLBACK.actor;
  return actor.charAt(0).toUpperCase() + actor.slice(1);
}

function formatContextLabel(proposal: ApprovalProposal): string {
  if (proposal.routeLabel?.trim()) return proposal.routeLabel.trim();
  if (proposal.category) {
    return proposal.category.replace(/_/g, " ");
  }
  if (proposal.specialist) return `Via ${proposal.specialist}`;
  return APPROVAL_AUDIT_FALLBACK.context;
}

function formatAuditNote(
  status: ApprovalStatus,
  proposal: ApprovalProposal,
): string | null {
  if (status === "pending") return null;

  const mutation = getProjectToolMutationAudit(proposal.id);
  if (mutation && status === "approved") {
    return formatProjectToolMutationMessage(mutation);
  }

  if (status === "approved" && proposal.missionKind === RESEARCH_ASSIGNMENT_DISPATCH_KIND) {
    const live = resolveLiveResearchAssignmentFromProposal(proposal);
    if (live) {
      return formatResearchAssignmentAuditNote(live);
    }
  }

  if (
    status === "approved" &&
    (proposal.missionKind === OBSIDIAN_PROJECT_NOTE_DRAFT_KIND ||
      proposal.missionKind === GITHUB_PR_COMMENT_DRAFT_KIND)
  ) {
    const target =
      proposal.obsidianNoteDraft?.targetPath ??
      (proposal.githubPrCommentDraft
        ? `${proposal.githubPrCommentDraft.repo}#${proposal.githubPrCommentDraft.prNumber}`
        : null);
    return target
      ? `Approved project tool draft for ${target} — see execution feedback for write/post outcome.`
      : "Approved project tool draft — see execution feedback for write/post outcome.";
  }

  const auditMessage = resolvedApprovalMessage(status, {
    decidedAt: proposal.decidedAt,
    decidedBy: proposal.decidedBy,
  });

  if (auditMessage) return auditMessage;
  if (proposal.riskNote?.trim()) return proposal.riskNote.trim();
  return null;
}

export function buildApprovalAuditEntry(proposal: ApprovalProposal): ApprovalAuditEntry | null {
  if (proposal.status === "pending") return null;

  const action = proposal.status;
  const timestampIso = proposal.decidedAt ?? null;

  return {
    id: proposal.id,
    action,
    actionLabel: APPROVAL_STATUS_LABEL[action],
    actorLabel: formatActorLabel(proposal.decidedBy),
    timestamp: timestampIso
      ? formatChiefTimestamp(timestampIso)
      : APPROVAL_AUDIT_FALLBACK.timestamp,
    timestampIso,
    targetTitle: proposal.title?.trim() || APPROVAL_AUDIT_FALLBACK.target,
    contextLabel: formatContextLabel(proposal),
    note: formatAuditNote(action, proposal),
    badgeClass: APPROVAL_STATUS_BADGE[action],
  };
}

export function buildApprovalAuditEntries(
  proposals: ApprovalProposal[],
): ApprovalAuditEntry[] {
  return proposals
    .map(buildApprovalAuditEntry)
    .filter((entry): entry is ApprovalAuditEntry => entry !== null)
    .sort((a, b) => {
      const aTime = a.timestampIso ? new Date(a.timestampIso).getTime() : 0;
      const bTime = b.timestampIso ? new Date(b.timestampIso).getTime() : 0;
      return bTime - aTime;
    });
}
