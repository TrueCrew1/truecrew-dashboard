import type { FocusItem, LinkedEntityRef, Task, WorkflowType } from "@/types";
import { SHIFT_STAT_LINKS } from "../../../lib/queries/dashboard-stats";

export const CHIEF_ROUTES = {
  today: "/",
  builds: "/builds",
  operations: "/operations",
  operationsOverdue: SHIFT_STAT_LINKS.overduePMs,
  operationsOpenWork: SHIFT_STAT_LINKS.openWorkOrders,
  monitor: "/monitor",
  monitorActive: SHIFT_STAT_LINKS.activeIncidents,
  repair: "/repair",
  review: "/review",
  customers: "/customers",
  knowledge: "/knowledge",
} as const;

export function routeForWorkflowType(type: WorkflowType): string {
  switch (type) {
    case "build":
      return CHIEF_ROUTES.builds;
    case "repair":
      return CHIEF_ROUTES.repair;
    case "deploy":
      return CHIEF_ROUTES.review;
    case "onboarding":
      return CHIEF_ROUTES.customers;
    default:
      return CHIEF_ROUTES.operations;
  }
}

export function routeForTask(task: Pick<Task, "workflowType">): string {
  return routeForWorkflowType(task.workflowType);
}

export function routeForFocusItem(item: FocusItem): string {
  return routeForWorkflowType(item.workflowType);
}

export function routeForEntityRef(ref: LinkedEntityRef): string {
  switch (ref.type) {
    case "incident":
      return CHIEF_ROUTES.monitor;
    case "deploy":
      return CHIEF_ROUTES.review;
    case "customer":
      return CHIEF_ROUTES.customers;
    case "runbook":
      return CHIEF_ROUTES.knowledge;
    default:
      return CHIEF_ROUTES.operations;
  }
}

export function routeLabelForPath(path: string): string {
  if (path === CHIEF_ROUTES.today) return "Today";
  if (path.startsWith(CHIEF_ROUTES.operations)) return "Operations";
  if (path === CHIEF_ROUTES.builds) return "Builds";
  if (path.startsWith(CHIEF_ROUTES.monitor)) return "Monitor";
  if (path === CHIEF_ROUTES.repair) return "Repair";
  if (path === CHIEF_ROUTES.review) return "Review";
  if (path === CHIEF_ROUTES.customers) return "Customers";
  if (path === CHIEF_ROUTES.knowledge) return "Knowledge";
  return "Open";
}
