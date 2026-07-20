import {
  GOVERNANCE_STATUSES,
  type GovernanceStatus,
  type IntegrationInventoryEntry,
  type ToolGovernanceEntry,
} from "./types.js";

const REQUIRED_TOOL_FIELDS: (keyof ToolGovernanceEntry)[] = [
  "id",
  "name",
  "category",
  "owner",
  "bestUse",
  "avoidUse",
  "configSummary",
  "failureSigns",
  "sopReference",
  "status",
];

const REQUIRED_INTEGRATION_FIELDS: (keyof IntegrationInventoryEntry)[] = [
  "id",
  "serviceName",
  "purpose",
  "usedIn",
  "envDependencies",
  "status",
  "failureBehavior",
  "operatorRole",
];

function assertUniqueIds(ids: string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${label} id: ${id}`);
    }
    seen.add(id);
  }
}

function assertNonEmpty(value: string, field: string, id: string): void {
  if (!value.trim()) {
    throw new Error(`${field} must be non-empty for ${id}`);
  }
}

function assertValidStatus(status: string): asserts status is GovernanceStatus {
  if (!(GOVERNANCE_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Invalid governance status: ${status}`);
  }
}

export function validateToolGovernanceCatalog(
  entries: readonly ToolGovernanceEntry[],
): void {
  assertUniqueIds(
    entries.map((entry) => entry.id),
    "tool",
  );

  for (const entry of entries) {
    for (const field of REQUIRED_TOOL_FIELDS) {
      const value = entry[field];
      if (typeof value === "string") {
        assertNonEmpty(value, field, entry.id);
      }
    }
    assertValidStatus(entry.status);
  }
}

export function validateIntegrationsInventory(
  entries: readonly IntegrationInventoryEntry[],
): void {
  assertUniqueIds(
    entries.map((entry) => entry.id),
    "integration",
  );

  for (const entry of entries) {
    for (const field of REQUIRED_INTEGRATION_FIELDS) {
      const value = entry[field];
      if (typeof value === "string") {
        assertNonEmpty(value, field, entry.id);
      }
      if (field === "usedIn" && (!Array.isArray(value) || value.length === 0)) {
        throw new Error(`usedIn must be non-empty for ${entry.id}`);
      }
    }
    assertValidStatus(entry.status);
  }
}

export function listCatalogIds(entries: readonly { id: string }[]): string[] {
  return entries.map((entry) => entry.id);
}
