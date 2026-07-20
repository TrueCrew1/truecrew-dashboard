import { existsSync } from "node:fs";
import { join } from "node:path";

export interface V1CapabilityPresence {
  dailyTurnover: boolean;
  builderReport: boolean;
  governedSlack: boolean;
  approvalActivity: boolean;
  toolGovernanceCatalog: boolean;
  integrationsInventory: boolean;
}

export function detectV1CapabilityPresence(root = process.cwd()): V1CapabilityPresence {
  return {
    dailyTurnover: existsSync(join(root, "lib/chief/dailyTurnover.ts")),
    builderReport: existsSync(join(root, "lib/build/builderReport.ts")),
    governedSlack: existsSync(join(root, "lib/governedLoopSlack.ts")),
    approvalActivity: existsSync(join(root, "lib/approvals/approvalActivityStore.ts")),
    toolGovernanceCatalog: existsSync(join(root, "lib/ops/toolGovernanceCatalog.ts")),
    integrationsInventory: existsSync(join(root, "lib/ops/integrationsInventory.ts")),
  };
}
