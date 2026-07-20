import { existsSync } from "node:fs";
import { join } from "node:path";

export type V1MergeSliceId =
  | "tool-governance-catalog"
  | "operational-readiness"
  | "command-center-ops-status"
  | "evidence-trail"
  | "daily-turnover"
  | "builder-v1-report";

/** Slice state relative to main merge progress (not disk presence alone). */
export type V1SliceStatus = "merged" | "present" | "missing";

export interface V1MergeSlice {
  id: V1MergeSliceId;
  label: string;
  prNumber: number | null;
  branch: string | null;
  /** All marker paths must exist for the slice to be considered present on disk. */
  markerPaths: readonly string[];
  /** Lower slices in the stack that should merge before this one. */
  dependsOn: readonly V1MergeSliceId[];
  /** Required for the in-repo V1 operational baseline (excludes optional builder report). */
  requiredForBaseline: boolean;
  mergeOrder: number;
}

export interface V1SliceReadiness {
  id: V1MergeSliceId;
  label: string;
  status: V1SliceStatus;
  presentOnDisk: boolean;
  mergedToMain: boolean;
  requiredForBaseline: boolean;
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
    dependsOn: [],
    requiredForBaseline: true,
    mergeOrder: 1,
  },
  {
    id: "operational-readiness",
    label: "Chief operational readiness summary",
    prNumber: 163,
    branch: "cursor/chief-operational-readiness-0eaa",
    markerPaths: ["lib/chief/operationalReadiness.ts"],
    dependsOn: ["tool-governance-catalog"],
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
    dependsOn: ["operational-readiness"],
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
    dependsOn: ["command-center-ops-status"],
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
    dependsOn: ["evidence-trail"],
    requiredForBaseline: true,
    mergeOrder: 5,
  },
  {
    id: "builder-v1-report",
    label: "Builder V1 structured report",
    prNumber: null,
    branch: "cursor/builder-v1-report-0eaa",
    markerPaths: ["lib/build/builderReport.ts"],
    dependsOn: [],
    requiredForBaseline: false,
    mergeOrder: 6,
  },
] as const;

export const REQUIRED_BASELINE_SLICE_IDS: readonly V1MergeSliceId[] = V1_MERGE_SLICES.filter(
  (slice) => slice.requiredForBaseline,
).map((slice) => slice.id);

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

/**
 * Returns slices in merge order, validating that every dependsOn edge points to
 * an earlier position in the sequence.
 */
export function computeMergeOrder(
  slices: readonly V1MergeSlice[] = V1_MERGE_SLICES,
): V1MergeSlice[] {
  const ordered = [...slices].sort((a, b) => a.mergeOrder - b.mergeOrder);
  const indexById = new Map(ordered.map((slice, index) => [slice.id, index]));

  for (const slice of ordered) {
    const sliceIndex = indexById.get(slice.id);
    if (sliceIndex === undefined) continue;

    for (const dependencyId of slice.dependsOn) {
      const dependencyIndex = indexById.get(dependencyId);
      if (dependencyIndex === undefined) {
        throw new Error(`Unknown merge dependency: ${slice.id} -> ${dependencyId}`);
      }
      if (dependencyIndex >= sliceIndex) {
        throw new Error(
          `Invalid merge order: ${slice.id} depends on ${dependencyId} but merges earlier or at the same position.`,
        );
      }
    }
  }

  return ordered;
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

export function listMissingMergedBaselineSliceIds(
  mergedSliceIds: readonly V1MergeSliceId[],
): V1MergeSliceId[] {
  const merged = new Set(mergedSliceIds);
  return V1_MERGE_SLICES.filter(
    (slice) => slice.requiredForBaseline && !merged.has(slice.id),
  ).map((slice) => slice.id);
}

/**
 * True when every required slice marker set is present on disk.
 * This does NOT mean merged to main — use isBaselineMerged for that.
 */
export function isBaselineAchieved(
  root = process.cwd(),
  options?: { presentSliceIds?: readonly V1MergeSliceId[] },
): boolean {
  return listMissingBaselineSliceIds(root, options).length === 0;
}

/**
 * True when every required slice is recorded as merged to main.
 * Pass mergedSliceIds from CI/git metadata or test fixtures.
 */
export function isBaselineMerged(mergedSliceIds: readonly V1MergeSliceId[]): boolean {
  return listMissingMergedBaselineSliceIds(mergedSliceIds).length === 0;
}

export function evaluateSliceReadiness(input: {
  root?: string;
  presentSliceIds?: readonly V1MergeSliceId[];
  mergedSliceIds?: readonly V1MergeSliceId[];
}): V1SliceReadiness[] {
  const root = input.root ?? process.cwd();
  const present = new Set(input.presentSliceIds ?? detectPresentSliceIds(root));
  const merged = new Set(input.mergedSliceIds ?? []);

  return V1_MERGE_SLICES.map((slice) => {
    const presentOnDisk = present.has(slice.id);
    const mergedToMain = merged.has(slice.id);
    const status: V1SliceStatus = mergedToMain
      ? "merged"
      : presentOnDisk
        ? "present"
        : "missing";

    return {
      id: slice.id,
      label: slice.label,
      status,
      presentOnDisk,
      mergedToMain,
      requiredForBaseline: slice.requiredForBaseline,
    };
  });
}

/** @deprecated Use computeMergeOrder — kept for callers that filtered by presence. */
export function orderedMergeSlices(
  presentSliceIds?: readonly V1MergeSliceId[],
): V1MergeSlice[] {
  const ordered = computeMergeOrder();
  if (!presentSliceIds) return ordered;
  const present = new Set(presentSliceIds);
  return ordered.filter((slice) => present.has(slice.id));
}
