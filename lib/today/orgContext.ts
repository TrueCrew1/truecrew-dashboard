import type { TodayOrgContext } from "../../src/types/todayWorkOrders.js";

/**
 * v1 org scope for the Today work-orders read model — single org from env.
 * Returns null when required vars are missing (caller should respond 403).
 */
export function getConfiguredTodayOrgContext(): TodayOrgContext | null {
  const orgId = process.env.TODAY_ORG_ID?.trim();
  const orgName = process.env.TODAY_ORG_NAME?.trim();

  if (!orgId || !orgName) {
    return null;
  }

  return {
    org_id: orgId,
    org_name: orgName,
    membership_role: process.env.TODAY_MEMBERSHIP_ROLE?.trim() || "Supervisor",
    membership_status: process.env.TODAY_MEMBERSHIP_STATUS?.trim() || "active",
  };
}
