export type ApprovalActivityDecision = "approved" | "rejected" | "sent_back";

/** Durable snapshot written when an operator records a Chief approval decision. */
export interface ApprovalActivityRecord {
  proposalId: string;
  title: string;
  summary: string;
  decision: ApprovalActivityDecision;
  decidedAt: string;
  actor: "founder" | "operator" | "observer" | null;
  source?: string;
  category?: string;
  missionKind?: string;
  recordedAt: string;
}

export interface ApprovalActivitySnapshotInput {
  proposalId: string;
  title: string;
  summary: string;
  decision: ApprovalActivityDecision;
  decidedAt: string;
  actor: "founder" | "operator" | "observer" | null;
  source?: string;
  category?: string;
  missionKind?: string;
}
