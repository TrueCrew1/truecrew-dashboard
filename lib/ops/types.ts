export type GovernanceStatus = "active" | "partial" | "not_wired" | "planned";

export const GOVERNANCE_STATUSES: readonly GovernanceStatus[] = [
  "active",
  "partial",
  "not_wired",
  "planned",
];

export type ToolGovernanceCategory =
  | "agent"
  | "platform"
  | "data"
  | "ai"
  | "dev"
  | "ops";

export interface ToolGovernanceEntry {
  id: string;
  name: string;
  category: ToolGovernanceCategory;
  owner: string;
  bestUse: string;
  avoidUse: string;
  configSummary: string;
  failureSigns: string;
  sopReference: string;
  status: GovernanceStatus;
}

export interface IntegrationInventoryEntry {
  id: string;
  serviceName: string;
  purpose: string;
  usedIn: string[];
  envDependencies: string[];
  status: GovernanceStatus;
  failureBehavior: string;
  operatorRole: string;
  notes?: string;
}
