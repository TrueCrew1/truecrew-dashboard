import { describe, expect, it } from "vitest";
import { mockData } from "@/data/mockData";
import {
  buildChiefLiveContext,
  deriveApprovalCandidates,
  resolveChiefCommand,
} from "./chiefLiveContext";

describe("resolveChiefCommand unmatched flag", () => {
  const ctx = buildChiefLiveContext(mockData);
  const approvals = deriveApprovalCandidates(mockData, ctx);

  it("does not mark a specific resolver match as unmatched", () => {
    const result = resolveChiefCommand("what's blocked?", mockData, ctx, approvals);
    expect(result.unmatched).toBeUndefined();
  });

  it("marks the catch-all 'no specialist match' response as unmatched", () => {
    const result = resolveChiefCommand("zzz totally unrecognized gibberish zzz", mockData, ctx, approvals);
    expect(result.unmatched).toBe(true);
  });
});
