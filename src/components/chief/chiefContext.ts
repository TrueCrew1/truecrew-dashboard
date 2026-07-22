/**
 * Chief's active-context model: which job Chief is currently operating in.
 * Real state, not a prompt convention — see ChiefContextProvider.tsx for the
 * provider that holds it, and chiefContextScope.ts for how it filters data.
 *
 * "global" is the parent/company dashboard (all workflowType/customer data).
 * "ms-painting" is a real scoped project — its own customer, tasks, and
 * workflow (see mockData.ts) — not another dashboard card. Extension point:
 * add another project's id/definition here plus its own seed data to give
 * Chief a third context.
 */
export type ChiefContextId = "global" | "ms-painting";

export interface ChiefContextDefinition {
  id: ChiefContextId;
  label: string;
  shortLabel: string;
  kind: "global" | "project";
  description: string;
}

export const DEFAULT_CHIEF_CONTEXT: ChiefContextId = "global";

export const CHIEF_CONTEXTS: Record<ChiefContextId, ChiefContextDefinition> = {
  global: {
    id: "global",
    label: "Global — Parent Dashboard",
    shortLabel: "Global",
    kind: "global",
    description:
      "All company-wide operational signals: every task, workflow, incident, deploy, and customer, plus the platform demo/gate approval sources.",
  },
  "ms-painting": {
    id: "ms-painting",
    label: "M&S Painting",
    shortLabel: "M&S Painting",
    kind: "project",
    description:
      "Scoped to M&S Painting's own tasks, workflow, and customer record only. Parent/global approval cards and platform demo sources do not appear here.",
  },
};

export const CHIEF_CONTEXT_LIST: ChiefContextDefinition[] = Object.values(CHIEF_CONTEXTS);

export function isChiefContextId(value: string): value is ChiefContextId {
  return value === "global" || value === "ms-painting";
}
