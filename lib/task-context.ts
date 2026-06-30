import type { Customer, Task, Workflow } from "../src/types";

export const NO_CUSTOMER_LINKED = "No customer linked";

export type CustomerResolutionSource =
  | "linked_entity"
  | "linked_ticket"
  | "title_match"
  | "none";

export interface ResolvedCustomer {
  name: string;
  id?: string;
  source: CustomerResolutionSource;
}

export interface TaskContext {
  customerName: string;
  customerSource: CustomerResolutionSource;
  workOrderName: string;
  workOrderId: string;
}

export interface TaskContextData {
  customers: Pick<Customer, "id" | "name" | "linkedTicketIds">[];
  workflows: Workflow[];
}

type TaskLinkInput = Pick<Task, "id" | "title" | "description" | "linkedEntities"> & {
  workflowType?: string;
};

type CustomerLinkInput = Pick<Customer, "id" | "name" | "linkedTicketIds">;

const CUSTOMER_FACING_WORKFLOW_TYPES = new Set(["onboarding", "ticket"]);

function resolveExplicitCustomer(
  task: TaskLinkInput,
  customers: CustomerLinkInput[],
): ResolvedCustomer | undefined {
  const linked = task.linkedEntities.find((entity) => entity.type === "customer");
  if (linked) {
    const byId = customers.find((customer) => customer.id === linked.id);
    if (byId) {
      return { name: byId.name, id: byId.id, source: "linked_entity" };
    }
    if (linked.label.trim()) {
      return { name: linked.label, id: linked.id, source: "linked_entity" };
    }
  }

  const fromTicket = customers.find((customer) => customer.linkedTicketIds.includes(task.id));
  if (fromTicket) {
    return { name: fromTicket.name, id: fromTicket.id, source: "linked_ticket" };
  }

  return undefined;
}

function inferCustomerFromTitle(
  task: TaskLinkInput,
  customers: CustomerLinkInput[],
): ResolvedCustomer | undefined {
  if (!task.workflowType || !CUSTOMER_FACING_WORKFLOW_TYPES.has(task.workflowType)) {
    return undefined;
  }

  const title = task.title.toLowerCase();
  const matches = customers.filter((customer) => {
    const name = customer.name.trim();
    if (name.length < 4) return false;
    return title.includes(name.toLowerCase());
  });

  if (matches.length !== 1) return undefined;

  const match = matches[0];
  return { name: match.name, id: match.id, source: "title_match" };
}

export function resolveCustomerForTask(
  task: TaskLinkInput,
  customers: CustomerLinkInput[],
  { allowTitleMatch = true }: { allowTitleMatch?: boolean } = {},
): ResolvedCustomer {
  const explicit = resolveExplicitCustomer(task, customers);
  if (explicit) return explicit;

  if (allowTitleMatch) {
    const inferred = inferCustomerFromTitle(task, customers);
    if (inferred) return inferred;
  }

  return { name: NO_CUSTOMER_LINKED, source: "none" };
}

export function resolveTaskContextFromTask(
  task: Task,
  data: TaskContextData,
): TaskContext {
  const customer = resolveCustomerForTask(task, data.customers);

  const linkedWorkflow = data.workflows.find((workflow) =>
    workflow.linkedTaskIds.includes(task.id),
  );

  return {
    customerName: customer.name,
    customerSource: customer.source,
    workOrderName: linkedWorkflow?.title ?? task.title,
    workOrderId: task.id,
  };
}

export function resolveEntityContext(
  entityId: string,
  tasks: Task[],
  data: TaskContextData,
): TaskContext {
  const task = tasks.find((entry) => entry.id === entityId);
  if (task) return resolveTaskContextFromTask(task, data);

  const workflow = data.workflows.find((entry) => entry.id === entityId);
  if (workflow) {
    const linkedTask = tasks.find((entry) => workflow.linkedTaskIds.includes(entry.id));
    if (linkedTask) return resolveTaskContextFromTask(linkedTask, data);

    return {
      customerName: NO_CUSTOMER_LINKED,
      customerSource: "none",
      workOrderName: workflow.title,
      workOrderId: workflow.id,
    };
  }

  return {
    customerName: NO_CUSTOMER_LINKED,
    customerSource: "none",
    workOrderName: entityId,
    workOrderId: entityId,
  };
}

/** Sync explicit customer links only — never persist inferred matches. */
export function enrichTaskCustomerLinks<
  T extends TaskLinkInput,
  C extends CustomerLinkInput,
>(tasks: T[], customers: C[]): { tasks: T[]; customers: C[] } {
  const enrichedCustomers = customers.map((customer) => ({
    ...customer,
    linkedTicketIds: [...customer.linkedTicketIds],
  }));

  const enrichedTasks = tasks.map((task) => ({
    ...task,
    linkedEntities: [...task.linkedEntities],
  }));

  for (const task of enrichedTasks) {
    const customer = resolveCustomerForTask(task, enrichedCustomers, {
      allowTitleMatch: false,
    });
    if (customer.source === "none" || !customer.id) continue;

    if (!task.linkedEntities.some((entity) => entity.type === "customer")) {
      task.linkedEntities.push({
        type: "customer",
        id: customer.id,
        label: customer.name,
      });
    }

    const customerRecord = enrichedCustomers.find((entry) => entry.id === customer.id);
    if (customerRecord && !customerRecord.linkedTicketIds.includes(task.id)) {
      customerRecord.linkedTicketIds.push(task.id);
    }
  }

  return { tasks: enrichedTasks, customers: enrichedCustomers };
}
