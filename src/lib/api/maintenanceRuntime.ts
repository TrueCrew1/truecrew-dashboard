import type {
  MaintenanceTaskPayload,
  RuntimeMaintenanceWorkItemClient,
  RuntimeTriggerType,
} from "@/types/runtime";
import { internalApiHeaders } from "./librarianRuntime";

export function maintenanceTaskIdempotencyKey(proposalId: string): string {
  return `maintenance:maintenance_task:${proposalId}`;
}

export function buildMaintenanceTaskPayloadFromProposal(params: {
  proposalId: string;
  title: string;
  summary: string;
  recommendedAction: string;
  riskNote?: string;
  decisionLabel: string;
}): MaintenanceTaskPayload {
  return {
    title: params.title,
    description: `${params.decisionLabel}. ${params.recommendedAction}`,
    context: params.summary,
    notes: params.riskNote,
  };
}

export async function fetchMaintenanceWorkItems(
  limit = 20,
): Promise<RuntimeMaintenanceWorkItemClient[]> {
  const response = await fetch(`/api/runtime/maintenance/work-items?limit=${limit}`, {
    headers: internalApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Maintenance work items API returned ${response.status}`);
  }

  const body = (await response.json()) as { workItems?: RuntimeMaintenanceWorkItemClient[] };
  return body.workItems ?? [];
}

export async function enqueueMaintenanceTask(params: {
  triggerType?: RuntimeTriggerType;
  inputPayload: MaintenanceTaskPayload;
  idempotencyKey: string;
  chiefProposalId: string;
  requestedBy?: "founder" | "operator" | "observer";
}): Promise<{ workItem: RuntimeMaintenanceWorkItemClient; created: boolean }> {
  const response = await fetch("/api/runtime/maintenance/work-items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...internalApiHeaders(),
    },
    body: JSON.stringify({
      triggerType: params.triggerType ?? "reactive",
      inputPayload: params.inputPayload,
      idempotencyKey: params.idempotencyKey,
      chiefProposalId: params.chiefProposalId,
      requestedBy: params.requestedBy ?? "operator",
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    workItem?: RuntimeMaintenanceWorkItemClient;
    created?: boolean;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Maintenance enqueue API returned ${response.status}`);
  }

  if (!body.workItem) {
    throw new Error("Maintenance enqueue API returned no work item");
  }

  return { workItem: body.workItem, created: body.created ?? true };
}
