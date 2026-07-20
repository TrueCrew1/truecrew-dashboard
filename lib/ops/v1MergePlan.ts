import { existsSync } from "node:fs";
import { join } from "node:path";

export type V1MergeSliceId =
  | "tool-governance-catalog"
  | "operational-readiness"
  | "command-center-ops-status"
  | "evidence-trail"
  | "daily-turnover"
  | "builder-v1-report";

export interface V1MergeSlice {
  id: V1MergeSliceId;
  label: string;
  prNumber: number | null;
  branch: string | null;
  /** All marker paths must exist for the slice to be considered present on disk. */
  markerPaths: readonly string[];
  /** Required for the in-repo V1 operational baseline (excludes optional builder report). */
  requiredForBaseline: boolean;
  mergeOrder: number;
}

/**
 * Ordered V1 merge slices for the current dashboard stack.
 * Presence is detected from marker files — not GitHub PR state.
 */
export const V1_MERGE_SLICES: readonly V1MergeSlice[] = [
  {
    id: "tool-governance-catalog",
    label: "Tool governance catalog + integrations inventory",
    prNumber: 162,
    branch: "cursor/tool-governance-catalog-0eaa",
    markerPaths: [
      "lib/ops/toolGovernanceCatalog.ts",
      "lib/ops/integrationsInventory.ts",
    ],
    requiredForBaseline: true,
    mergeOrder: 1,
  },
  {
    id: "operational-readiness",
    label: "Chief operational readiness summary",
    prNumber: 163,
    branch: "cursor/chief-operational-readiness-0eaa",
    markerPaths: ["lib/chief/operationalReadiness.ts"],
    requiredForBaseline: true,
    mergeOrder: 2,
  },
  {
    id: "command-center-ops-status",
    label: "Command Center operational status panel",
    prNumber: 164,
    branch: "cursor/chief-command-center-ops-status-0eaa",
    markerPaths: [
      "src/components/chief/ChiefOperationalStatusPanel.tsx",
      "src/lib/ops/operationalReadinessView.ts",
    ],
    requiredForBaseline: true,
    mergeOrder: 3,
  },
  {
    id: "evidence-trail",
    label: "Chief governed evidence trail panel",
    prNumber: 165,
    branch: "cursor/chief-evidence-trail-0eaa",
    markerPaths: [
      "src/lib/chief/governedEvidenceTrail.ts",
      "src/components/chief/ChiefEvidenceTrailPanel.tsx",
    ],
    requiredForBaseline: true,
    mergeOrder: 4,
  },
  {
    id: "daily-turnover",
    label: "Chief daily turnover backend + panel",
    prNumber: 166,
    branch: "cursor/chief-daily-turnover-panel-0eaa",
    markerPaths: [
      "lib/chief/dailyTurnover.ts",
      "src/components/chief/ChiefDailyTurnoverPanel.tsx",
    ],
    requiredForBaseline: true,
    mergeOrder: 5,
  },
  {
    id: "builder-v1-report",
    label: "Builder V1 structured report",
    prNumber: null,
    branch: "cursor/builder-v1-report-0eaa",
    markerPaths: ["lib/build/builderReport.ts"],
    requiredForBaseline: false,
    mergeOrder: 6,
  },
] as const;

function sliceIsPresent(root: string, slice: V1MergeSlice): boolean {
  return slice.markerPaths.every((relativePath) =>
    existsSync(join(root, relativePath)),
  );
}

export function detectPresentSliceIds(root = process.cwd()): V1MergeSliceId[] {
  return V1_MERGE_SLICES.filter((slice) => sliceIsPresent(root, slice)).map(
    (slice) => slice.id,
  );
}

export function listMissingBaselineSliceIds(
  root = process.cwd(),
  options?: { presentSliceIds?: readonly V1MergeSliceId[] },
): V1MergeSliceId[] {
  const present = new Set(options?.presentSliceIds ?? detectPresentSliceIds(root));
  return V1_MERGE_SLICES.filter(
    (slice) => slice.requiredForBaseline && !present.has(slice.id),
  ).map((slice) => slice.id);
}

/**
 * True when every required V1 slice marker set is present on disk.
 * Use `presentSliceIds` in tests to approximate merged vs open-PR states.
 */
export function isBaselineAchieved(
  root = process.cwd(),
  options?: { presentSliceIds?: readonly V1MergeSliceId[] },
): boolean {
  return listMissingBaselineSliceIds(root, options).length === 0;
}

export function orderedMergeSlices(
  presentSliceIds?: readonly V1MergeSliceId[],
): V1MergeSlice[] {
  const present = presentSliceIds ? new Set(presentSliceIds) : null;
  return V1_MERGE_SLICES.filter((slice) =>
    present ? present.has(slice.id) : true,
  );
}
