import { describe, expect, it } from "vitest";
import {
  REQUIRED_BASELINE_SLICE_IDS,
  V1_MERGE_SLICES,
  computeMergeOrder,
  detectPresentSliceIds,
  evaluateSliceReadiness,
  isBaselineAchieved,
  isBaselineMerged,
  listMissingBaselineSliceIds,
  listMissingMergedBaselineSliceIds,
  type V1MergeSliceId,
} from "../lib/ops/v1MergePlan.js";

describe("V1_MERGE_SLICES registry", () => {
  it("lists slices in merge order with unique ids", () => {
    const ids = V1_MERGE_SLICES.map((slice) => slice.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(V1_MERGE_SLICES[0]?.id).toBe("tool-governance-catalog");
    expect(V1_MERGE_SLICES.at(-1)?.id).toBe("builder-v1-report");
  });

  it("marks builder report as optional for baseline", () => {
    const builder = V1_MERGE_SLICES.find((slice) => slice.id === "builder-v1-report");
    expect(builder?.requiredForBaseline).toBe(false);
    expect(REQUIRED_BASELINE_SLICE_IDS).not.toContain("builder-v1-report");
    expect(REQUIRED_BASELINE_SLICE_IDS).toHaveLength(5);
  });
});

describe("computeMergeOrder", () => {
  it("returns slices sorted by mergeOrder", () => {
    const ordered = computeMergeOrder();
    const orders = ordered.map((slice) => slice.mergeOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(ordered[0]?.id).toBe("tool-governance-catalog");
    expect(ordered.at(-1)?.id).toBe("builder-v1-report");
  });

  it("validates dependsOn edges point to earlier slices", () => {
    const turnover = V1_MERGE_SLICES.find((slice) => slice.id === "daily-turnover");
    expect(turnover?.dependsOn).toContain("evidence-trail");
    expect(() => computeMergeOrder()).not.toThrow();
  });

  it("throws when dependsOn violates merge order", () => {
    const invalid = V1_MERGE_SLICES.map((slice) =>
      slice.id === "tool-governance-catalog"
        ? { ...slice, dependsOn: ["daily-turnover"] as const }
        : slice,
    );
    expect(() => computeMergeOrder(invalid)).toThrow(/Invalid merge order/);
  });
});

describe("disk presence vs main merge", () => {
  it("detects the full V1 stack on this branch", () => {
    const present = detectPresentSliceIds(process.cwd());
    for (const sliceId of REQUIRED_BASELINE_SLICE_IDS) {
      expect(present, `expected slice present: ${sliceId}`).toContain(sliceId);
    }
    expect(isBaselineAchieved(process.cwd())).toBe(true);
    expect(listMissingBaselineSliceIds(process.cwd())).toEqual([]);
  });

  it("approximates pre-merge main with empty fixture ids", () => {
    const mainFixture: V1MergeSliceId[] = [];
    expect(isBaselineAchieved(process.cwd(), { presentSliceIds: mainFixture })).toBe(false);
    expect(listMissingBaselineSliceIds(process.cwd(), { presentSliceIds: mainFixture })).toEqual([
      ...REQUIRED_BASELINE_SLICE_IDS,
    ]);
  });

  it("treats baseline as unmerged when only disk markers exist", () => {
    expect(isBaselineMerged([])).toBe(false);
    expect(listMissingMergedBaselineSliceIds([])).toEqual([...REQUIRED_BASELINE_SLICE_IDS]);
  });

  it("reports merged baseline only when all required slices are recorded merged", () => {
    const partialMerge: V1MergeSliceId[] = [
      "tool-governance-catalog",
      "operational-readiness",
    ];
    expect(isBaselineMerged(partialMerge)).toBe(false);
    expect(isBaselineMerged([...REQUIRED_BASELINE_SLICE_IDS])).toBe(true);
  });
});

describe("evaluateSliceReadiness", () => {
  it("distinguishes present-on-branch from merged-to-main", () => {
    const readiness = evaluateSliceReadiness({
      root: process.cwd(),
      mergedSliceIds: ["tool-governance-catalog"],
    });

    const catalog = readiness.find((slice) => slice.id === "tool-governance-catalog");
    const turnover = readiness.find((slice) => slice.id === "daily-turnover");

    expect(catalog?.status).toBe("merged");
    expect(catalog?.presentOnDisk).toBe(true);
    expect(turnover?.status).toBe("present");
    expect(turnover?.mergedToMain).toBe(false);
  });

  it("marks absent slices as missing on a main fixture", () => {
    const readiness = evaluateSliceReadiness({
      presentSliceIds: [],
      mergedSliceIds: [],
    });

    expect(readiness.every((slice) => slice.status === "missing")).toBe(true);
    expect(readiness.every((slice) => !slice.presentOnDisk)).toBe(true);
  });
});
