import { internalApiHeaders } from "./librarianRuntime";

export interface ChiefApprovalAuditEvent {
  id: string;
  proposalId: string;
  action: string;
  status: "approved" | "rejected" | "sent_back" | null;
  actor: string | null;
  decidedAt: string;
  createdAt: string;
}

export async function fetchChiefApprovalAuditEvents(
  limit = 50,
): Promise<ChiefApprovalAuditEvent[]> {
  const response = await fetch(`/api/chief/approvals/audit?limit=${limit}`, {
    headers: internalApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Chief approval audit API returned ${response.status}`);
  }

  const body = (await response.json()) as { events?: ChiefApprovalAuditEvent[] };
  return body.events ?? [];
}
