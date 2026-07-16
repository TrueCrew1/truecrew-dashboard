import type {
  Customer,
  GateCheck,
  Incident,
  Task,
  Workflow,
} from "../src/types/index.js";
import { WorkflowStage } from "../src/types/index.js";

export function makeGate(overrides: Partial<GateCheck> = {}): GateCheck {
  return {
    id: "gate-1",
    label: "PR opened",
    required: true,
    passed: false,
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "operator",
    title: "Replace HVAC filter",
    description: "Routine maintenance",
    stage: WorkflowStage.InProgress,
    workflowType: "repair",
    priority: "medium",
    gates: [],
    linkedEntities: [],
    ...overrides,
  };
}

export function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: "wf-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "operator",
    title: "Rooftop unit overhaul",
    type: "repair",
    stage: WorkflowStage.InProgress,
    owner: "operator",
    summary: "",
    gates: [],
    linkedTaskIds: [],
    linkedEntityIds: [],
    ...overrides,
  };
}

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "operator",
    name: "Northside Facilities",
    slug: "northside",
    tier: "growth",
    stage: WorkflowStage.InProgress,
    primaryContact: "Sam",
    email: "sam@example.com",
    healthScore: 80,
    status: "active",
    linkedTicketIds: [],
    onboardingChecklist: [],
    ...overrides,
  };
}

export function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "inc-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "operator",
    title: "Pump failure",
    severity: 2,
    status: "open",
    serviceId: "svc-1",
    serviceName: "Water pump",
    summary: "",
    openedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
