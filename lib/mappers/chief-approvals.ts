import type { DbChiefApprovalDecisionRow } from "../supabase/queries.js";

export interface ClientChiefApprovalDecision {
  proposalId: string;
  status: "approved" | "rejected" | "sent_back";
  decidedAt: string;
  actor: "founder" | "operator" | "observer" | null;
}

function isPersona(value: string | null): value is ClientChiefApprovalDecision["actor"] {
  return value === "founder" || value === "operator" || value === "observer";
}

export function mapDbChiefApprovalDecisionToClient(
  row: DbChiefApprovalDecisionRow,
): ClientChiefApprovalDecision {
  return {
    proposalId: row.proposal_id,
    status: row.status,
    decidedAt: row.decided_at,
    actor: isPersona(row.actor) ? row.actor : null,
  };
}
