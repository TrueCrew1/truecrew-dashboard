import { mockData } from "@/data/mockData";

/**
 * Stable record identifiers from the TS mock dataset, exported so a test can
 * assert each one has a matching row in the aligned Supabase seed migration
 * (supabase/migrations/20260626000002_seed_data.sql). No SQL is parsed or
 * imported here — this module only defines the expected IDs from the TS side.
 *
 * Only categories with full 1:1 coverage in that seed file today are
 * exported. `mockData.deploys` (deploy-000 has no seed row), `mockData.notes`
 * (note-004 has no seed row), `mockData.alerts`, and `mockData.focusItems`
 * (not seeded as distinct rows at all) are intentionally left out — including
 * them here would make the coherence check fail against the current,
 * unrelated SaaS-themed dataset rather than catching real drift.
 */

export function getSeededTaskIds(): string[] {
  return mockData.tasks.map((task) => task.id);
}

export function getSeededWorkflowIds(): string[] {
  return mockData.workflows.map((workflow) => workflow.id);
}

export function getSeededToolIds(): string[] {
  return mockData.tools.map((tool) => tool.id);
}

export function getSeededIncidentIds(): string[] {
  return mockData.incidents.map((incident) => incident.id);
}

export function getSeededCustomerIds(): string[] {
  return mockData.customers.map((customer) => customer.id);
}

export function getSeededRunbookIds(): string[] {
  return mockData.runbooks.map((runbook) => runbook.id);
}

export function getSeededPromptIds(): string[] {
  return mockData.prompts.map((prompt) => prompt.id);
}
