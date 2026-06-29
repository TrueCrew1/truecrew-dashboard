import type { Customer, LinkedEntityRef, Task } from "@/types";

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesSearch(text: string, query: string): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  return text.toLowerCase().includes(normalized);
}

export function getLinkedCustomerRef(task: Task): LinkedEntityRef | undefined {
  return task.linkedEntities.find((entity) => entity.type === "customer");
}

export function getLinkedCustomer(task: Task, customers: Customer[]): Customer | undefined {
  const ref = getLinkedCustomerRef(task);
  if (ref) {
    return customers.find((customer) => customer.id === ref.id);
  }

  return customers.find((customer) => customer.linkedTicketIds.includes(task.id));
}

export function getCustomerLabel(task: Task, customers: Customer[]): string | null {
  const customer = getLinkedCustomer(task, customers);
  if (customer) return customer.name;
  return getLinkedCustomerRef(task)?.label ?? null;
}

export function getTasksForCustomer(customer: Customer, tasks: Task[]): Task[] {
  const linkedIds = new Set(customer.linkedTicketIds);
  return tasks.filter(
    (task) =>
      linkedIds.has(task.id) ||
      task.linkedEntities.some(
        (entity) => entity.type === "customer" && entity.id === customer.id,
      ),
  );
}

export function taskMatchesSearch(
  task: Task,
  customers: Customer[],
  query: string,
): boolean {
  const customerLabel = getCustomerLabel(task, customers);
  const fields = [task.title, task.workflowType, task.assignee ?? "", customerLabel ?? ""];
  return fields.some((field) => matchesSearch(field, query));
}

export function customerMatchesSearch(customer: Customer, query: string): boolean {
  const fields = [
    customer.name,
    customer.tier,
    customer.status,
    customer.primaryContact,
    customer.email,
  ];
  return fields.some((field) => matchesSearch(field, query));
}
