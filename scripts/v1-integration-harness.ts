/**
 * V1 integration harness — run with merged baseline slice set.
 * Usage: npm run integration:harness
 */
import {
  runV1IntegrationChecks,
  summarizeIntegrationChecks,
} from "../lib/ops/v1IntegrationCheck.js";
import {
  REQUIRED_BASELINE_SLICE_IDS,
  detectPresentSliceIds,
  isBaselineMerged,
  isBaselinePresentOnDisk,
} from "../lib/ops/v1MergePlan.js";

const root = process.cwd();
const present = detectPresentSliceIds(root);
const mergedSliceIds = [...REQUIRED_BASELINE_SLICE_IDS];
const checks = runV1IntegrationChecks({ root, mergedSliceIds });
const defaults = runV1IntegrationChecks({ root });

const report = {
  generatedAt: new Date().toISOString(),
  present,
  onDisk: isBaselinePresentOnDisk(root),
  mergedBaseline: isBaselineMerged(mergedSliceIds),
  mergedSliceIds,
  defaultsMergePlan: defaults["merge-plan-main-merge"],
  withMergedFixture: {
    totals: summarizeIntegrationChecks(checks),
    checks,
  },
};

console.log(JSON.stringify(report, null, 2));

const mergePlan = checks["merge-plan-main-merge"];
if (mergePlan.outcome !== "pass") {
  console.error(
    `\nmerge-plan-main-merge expected pass, got ${mergePlan.outcome}: ${mergePlan.message}`,
  );
  process.exit(1);
}
