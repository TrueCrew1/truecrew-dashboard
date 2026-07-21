import type { LinkedEntityRef, Task, Workflow } from "@/types";
import type { MockData } from "@/data/mockData";
import type { ChiefContextId } from "./chiefContext";

function refsOfType(refs: LinkedEntityRef[], type: LinkedEntityRef["type"]): string[] {
  return refs.filter((ref) => ref.type === type).map((ref) => ref.id);
}

/**
 * The real data-flow switch: filters the same MockData shape Chief already
 * consumes down to one project's tasks/workflow/customer before any
 * approval-candidate derivation, board-item derivation, or command routing
 * runs. "global" is a no-op passthrough — every other Chief context (today
 * just "ms-painting") only sees tasks/workflows tagged with its projectId,
 * the customers those tasks link to, and the incidents/deploys/focus
 * items/alerts that reference that scoped data. This is what makes context
 * switching a source change instead of a display filter: derivation
 * functions never see the excluded records in the first place.
 *
 * Knowledge sources (runbooks, prompts, notes) stay unscoped in every
 * context — they're a shared reference library, not project-owned work.
 */
export function scopeDataToChiefContext(data: MockData, contextId: ChiefContextId): MockData {
  if (contextId === "global") return data;

  const projectId: string = contextId;
  const tasks: Task[] = data.tasks.filter((task) => task.projectId === projectId);
  const workflows: Workflow[] = data.workflows.filter(
    (workflow) => workflow.projectId === projectId,
  );

  const taskIds = new Set(tasks.map((task) => task.id));
  const workflowIds = new Set(workflows.map((workflow) => workflow.id));

  const customerIds = new Set([
    ...tasks.flatMap((task) => refsOfType(task.linkedEntities, "customer")),
    ...workflows.flatMap((workflow) => refsOfType(workflow.linkedEntityIds, "customer")),
  ]);

  const incidentIds = new Set(
    workflows.flatMap((workflow) => refsOfType(workflow.linkedEntityIds, "incident")),
  );

  const deployIds = new Set([
    ...tasks.flatMap((task) => refsOfType(task.linkedEntities, "deploy")),
    ...workflows.flatMap((workflow) => refsOfType(workflow.linkedEntityIds, "deploy")),
  ]);

  const scopedEntityIds = new Set([...taskIds, ...workflowIds, ...customerIds]);

  return {
    ...data,
    tasks,
    workflows,
    customers: data.customers.filter((customer) => customerIds.has(customer.id)),
    incidents: data.incidents.filter((incident) => incidentIds.has(incident.id)),
    deploys: data.deploys.filter((deploy) => deployIds.has(deploy.id)),
    focusItems: data.focusItems.filter((item) => taskIds.has(item.taskId)),
    alerts: data.alerts.filter(
      (alert) => alert.entityRef !== undefined && scopedEntityIds.has(alert.entityRef.id),
    ),
  };
}
