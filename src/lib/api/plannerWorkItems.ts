// Client for the planner work items task tracker (/api/planner/work-items).
//
// Not the agent-runtime client — see src/lib/api/plannerRuntime.ts for that.
// This talks to a separate table/route pair; do not point it at
// /api/runtime/planner/work-items.

import type { PlannerWorkItem, PlannerWorkItemInput } from "@/types/plannerWorkItems";
import { internalApiHeaders } from "./librarianRuntime";

const BASE_URL = "/api/planner/work-items";

async function parseWorkItems(response: Response, label: string): Promise<PlannerWorkItem[]> {
  if (!response.ok) {
    throw new Error(`${label} returned ${response.status}`);
  }
  const body = (await response.json()) as { workItems?: PlannerWorkItem[] };
  return body.workItems ?? [];
}

export async function getPlannerWorkItems(limit = 20): Promise<PlannerWorkItem[]> {
  const response = await fetch(`${BASE_URL}?limit=${limit}`, {
    headers: internalApiHeaders(),
  });
  return parseWorkItems(response, "Planner work items API");
}

export async function getLibrarianPlannerWorkItems(limit = 20): Promise<PlannerWorkItem[]> {
  const response = await fetch(`${BASE_URL}/librarian?limit=${limit}`, {
    headers: internalApiHeaders(),
  });
  return parseWorkItems(response, "Planner work items librarian view API");
}

export async function getMaintenancePlannerWorkItems(limit = 20): Promise<PlannerWorkItem[]> {
  const response = await fetch(`${BASE_URL}/maintenance?limit=${limit}`, {
    headers: internalApiHeaders(),
  });
  return parseWorkItems(response, "Planner work items maintenance view API");
}

export async function createPlannerWorkItem(
  input: PlannerWorkItemInput,
): Promise<PlannerWorkItem> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...internalApiHeaders(),
    },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    workItem?: PlannerWorkItem;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Planner work items create API returned ${response.status}`);
  }

  if (!body.workItem) {
    throw new Error("Planner work items create API returned no work item");
  }

  return body.workItem;
}
