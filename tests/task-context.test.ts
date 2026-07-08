import { describe, expect, it } from "vitest";
import {
  NO_CUSTOMER_LINKED,
  enrichTaskCustomerLinks,
  resolveCustomerForTask,
  resolveEntityContext,
  resolveTaskContextFromTask,
} from "../lib/task-context.js";
import { makeCustomer, makeTask, makeWorkflow } from "./fixtures.js";

describe("resolveCustomerForTask", () => {
  const acme = makeCustomer({ id: "c-acme", name: "Acme Corp", linkedTicketIds: [] });

  it("resolves via an explicit linked customer entity", () => {
    const task = makeTask({
      linkedEntities: [{ type: "customer", id: "c-acme", label: "Acme Corp" }],
    });
    expect(resolveCustomerForTask(task, [acme])).toEqual({
      name: "Acme Corp",
      id: "c-acme",
      source: "linked_entity",
    });
  });

  it("falls back to the linked entity label when the customer is unknown", () => {
    const task = makeTask({
      linkedEntities: [{ type: "customer", id: "c-x", label: "Ghost Co" }],
    });
    expect(resolveCustomerForTask(task, [acme])).toEqual({
      name: "Ghost Co",
      id: "c-x",
      source: "linked_entity",
    });
  });

  it("resolves via a customer's linked ticket ids", () => {
    const task = makeTask({ id: "ticket-9", workflowType: "ticket" });
    const linked = makeCustomer({ id: "c-1", name: "Bolt Co", linkedTicketIds: ["ticket-9"] });
    expect(resolveCustomerForTask(task, [linked])).toMatchObject({
      id: "c-1",
      source: "linked_ticket",
    });
  });

  it("infers from the title for customer-facing tasks when allowed", () => {
    const task = makeTask({
      title: "Onboarding for Acme Corp site",
      workflowType: "onboarding",
    });
    expect(resolveCustomerForTask(task, [acme])).toMatchObject({
      id: "c-acme",
      source: "title_match",
    });
  });

  it("does not infer from the title when allowTitleMatch is false", () => {
    const task = makeTask({ title: "Onboarding for Acme Corp", workflowType: "onboarding" });
    expect(resolveCustomerForTask(task, [acme], { allowTitleMatch: false }).source).toBe("none");
  });

  it("does not infer when the title matches multiple customers", () => {
    const task = makeTask({ title: "Acme Corp and Acme Corp again", workflowType: "onboarding" });
    const dup = makeCustomer({ id: "c-2", name: "Acme Corp", linkedTicketIds: [] });
    expect(resolveCustomerForTask(task, [acme, dup]).source).toBe("none");
  });

  it("ignores very short customer names during title inference", () => {
    const task = makeTask({ title: "fix abc unit", workflowType: "ticket" });
    const shortName = makeCustomer({ id: "c-3", name: "abc", linkedTicketIds: [] });
    expect(resolveCustomerForTask(task, [shortName]).source).toBe("none");
  });

  it("returns the no-customer sentinel when nothing resolves", () => {
    const task = makeTask({ workflowType: "build" });
    expect(resolveCustomerForTask(task, [acme])).toEqual({
      name: NO_CUSTOMER_LINKED,
      source: "none",
    });
  });
});

describe("resolveTaskContextFromTask", () => {
  it("uses a linked workflow title as the work order name", () => {
    const task = makeTask({ id: "t-1" });
    const workflow = makeWorkflow({ title: "Chiller rebuild", linkedTaskIds: ["t-1"] });
    const ctx = resolveTaskContextFromTask(task, { customers: [], workflows: [workflow] });
    expect(ctx.workOrderName).toBe("Chiller rebuild");
    expect(ctx.hasLinkedWorkflow).toBe(true);
    expect(ctx.workOrderId).toBe("t-1");
  });

  it("falls back to the task title when there is no linked workflow", () => {
    const task = makeTask({ id: "t-1", title: "Standalone job" });
    const ctx = resolveTaskContextFromTask(task, { customers: [], workflows: [] });
    expect(ctx.workOrderName).toBe("Standalone job");
    expect(ctx.hasLinkedWorkflow).toBe(false);
  });
});

describe("resolveEntityContext", () => {
  const task = makeTask({ id: "t-1", title: "Task title" });

  it("resolves directly when the id is a task", () => {
    expect(resolveEntityContext("t-1", [task], { customers: [], workflows: [] }).workOrderId).toBe(
      "t-1",
    );
  });

  it("resolves via the workflow's linked task when the id is a workflow", () => {
    const workflow = makeWorkflow({ id: "w-1", linkedTaskIds: ["t-1"] });
    const ctx = resolveEntityContext("w-1", [task], { customers: [], workflows: [workflow] });
    expect(ctx.workOrderId).toBe("t-1");
  });

  it("uses the workflow itself when it has no resolvable linked task", () => {
    const workflow = makeWorkflow({ id: "w-2", title: "Empty WF", linkedTaskIds: [] });
    const ctx = resolveEntityContext("w-2", [task], { customers: [], workflows: [workflow] });
    expect(ctx).toMatchObject({
      workOrderName: "Empty WF",
      workOrderId: "w-2",
      hasLinkedWorkflow: true,
      customerSource: "none",
    });
  });

  it("returns an unlinked placeholder for an unknown id", () => {
    const ctx = resolveEntityContext("mystery", [task], { customers: [], workflows: [] });
    expect(ctx).toMatchObject({
      workOrderName: "mystery",
      workOrderId: "mystery",
      hasLinkedWorkflow: false,
      customerSource: "none",
    });
  });
});

describe("enrichTaskCustomerLinks", () => {
  it("adds a customer link on both sides for an explicit ticket link", () => {
    const task = makeTask({ id: "ticket-1", workflowType: "ticket", linkedEntities: [] });
    const customer = makeCustomer({ id: "c-1", name: "Delta Co", linkedTicketIds: ["ticket-1"] });

    const { tasks, customers } = enrichTaskCustomerLinks([task], [customer]);

    expect(tasks[0].linkedEntities).toContainEqual({
      type: "customer",
      id: "c-1",
      label: "Delta Co",
    });
    expect(customers[0].linkedTicketIds).toContain("ticket-1");
  });

  it("does not mutate the input arrays", () => {
    const task = makeTask({ id: "ticket-1", workflowType: "ticket", linkedEntities: [] });
    const customer = makeCustomer({ id: "c-1", name: "Delta Co", linkedTicketIds: ["ticket-1"] });

    enrichTaskCustomerLinks([task], [customer]);

    expect(task.linkedEntities).toEqual([]);
    expect(customer.linkedTicketIds).toEqual(["ticket-1"]);
  });

  it("leaves tasks without a resolvable customer untouched", () => {
    const task = makeTask({ id: "t-1", workflowType: "build", linkedEntities: [] });
    const { tasks } = enrichTaskCustomerLinks([task], []);
    expect(tasks[0].linkedEntities).toEqual([]);
  });
});
