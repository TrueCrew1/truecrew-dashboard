import type {
  PlannerTaskPayload,
  RuntimePlannerWorkItemClient,
  RuntimeTriggerType,
} from "@/types/runtime";
import { internalApiHeaders } from "./librarianRuntime";

export function plannerTaskIdempotencyKey(proposalId: string): string {
  return `planner:planning_task:${proposalId}`;
}

export function buildPlannerTaskPayloadFromProposal(params: {
  proposalId: string;
  title: string;
  summary: string;
  recommendedAction: string;
  riskNote?: string;
  decisionLabel: string;
}): PlannerTaskPayload {
  return {
    title: params.title,
    description: `${params.decisionLabel}. ${params.recommendedAction}`,
    context: params.summary,
    notes: params.riskNote,
  };
}

export async function getPlannerWorkItems(limit = 20): Promise<RuntimePlannerWorkItemClient[]> {
  const response = await fetch(`/api/runtime/planner/work-items?limit=${limit}`, {
    headers: internalApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Planner work items API returned ${response.status}`);
  }

  const body = (await response.json()) as { workItems?: RuntimePlannerWorkItemClient[] };
  return body.workItems ?? [];
}

export async function enqueuePlannerWorkItem(params: {
  triggerType?: RuntimeTriggerType;
  inputPayload: PlannerTaskPayload;
  idempotencyKey: string;
  chiefProposalId: string;
  requestedBy?: "founder" | "operator" | "observer";
}): Promise<{ workItem: RuntimePlannerWorkItemClient; created: boolean }> {
  const response = await fetch("/api/runtime/planner/work-items", {
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
    workItem?: RuntimePlannerWorkItemClient;
    created?: boolean;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Planner enqueue API returned ${response.status}`);
  }

  if (!body.workItem) {
    throw new Error("Planner enqueue API returned no work item");
  }

  return { workItem: body.workItem, created: body.created ?? true };
}
