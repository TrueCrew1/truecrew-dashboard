import type {
  ChiefDecisionPayload,
  RuntimeTriggerType,
  RuntimeWorkItemClient,
} from "@/types/runtime";

export function internalApiHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_INTERNAL_KEY;
  if (!key) return {};
  return { "x-internal-key": key };
}

export function librarianDecisionIdempotencyKey(proposalId: string): string {
  return `librarian:chief_decision:${proposalId}`;
}

export function buildChiefDecisionPayloadFromProposal(params: {
  proposalId: string;
  title: string;
  summary: string;
  recommendedAction: string;
  riskNote?: string;
  decisionLabel: string;
}): ChiefDecisionPayload {
  return {
    title: params.title,
    decision: `${params.decisionLabel}. ${params.recommendedAction}`,
    context: params.summary,
    consequences: params.riskNote,
    proposalId: params.proposalId,
  };
}

export async function fetchLibrarianWorkItems(
  limit = 20,
): Promise<RuntimeWorkItemClient[]> {
  const response = await fetch(`/api/runtime/librarian/work-items?limit=${limit}`, {
    headers: internalApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Librarian work items API returned ${response.status}`);
  }

  const body = (await response.json()) as { workItems?: RuntimeWorkItemClient[] };
  return body.workItems ?? [];
}

export async function enqueueLibrarianChiefDecision(params: {
  triggerType?: RuntimeTriggerType;
  inputPayload: ChiefDecisionPayload;
  idempotencyKey: string;
  chiefProposalId: string;
  requestedBy?: "founder" | "operator" | "observer";
}): Promise<{ workItem: RuntimeWorkItemClient; created: boolean }> {
  const response = await fetch("/api/runtime/librarian/work-items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...internalApiHeaders(),
    },
    body: JSON.stringify({
      inputKind: "chief_decision",
      triggerType: params.triggerType ?? "reactive",
      inputPayload: params.inputPayload,
      idempotencyKey: params.idempotencyKey,
      chiefProposalId: params.chiefProposalId,
      requestedBy: params.requestedBy ?? "operator",
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    workItem?: RuntimeWorkItemClient;
    created?: boolean;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Librarian enqueue API returned ${response.status}`);
  }

  if (!body.workItem) {
    throw new Error("Librarian enqueue API returned no work item");
  }

  return { workItem: body.workItem, created: body.created ?? true };
}
