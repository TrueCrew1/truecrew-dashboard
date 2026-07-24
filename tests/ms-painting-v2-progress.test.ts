import { describe, expect, it } from "vitest";
import {
  MS_PAINTING_V2_PROGRESS_STATUS,
  packageStateBadgeTone,
  subsystemStateBadgeTone,
} from "@/data/msPaintingV2Status";

describe("MS_PAINTING_V2_PROGRESS_STATUS", () => {
  it("lists the four required packages as FILED", () => {
    expect(MS_PAINTING_V2_PROGRESS_STATUS.packages.map((p) => [p.id, p.state])).toEqual([
      ["0100", "FILED"],
      ["0200", "FILED"],
      ["0300", "FILED"],
      ["0400", "FILED"],
    ]);
  });

  it("lists subsystem operational states", () => {
    expect(MS_PAINTING_V2_PROGRESS_STATUS.subsystems.map((s) => [s.label, s.state])).toEqual([
      ["Research", "NOT LIVE"],
      ["Build", "DEGRADED"],
      ["Librarian", "NOT LIVE"],
      ["Monitor", "CONFIG ONLY"],
    ]);
  });

  it("carries P0 priority and four known blockers", () => {
    expect(MS_PAINTING_V2_PROGRESS_STATUS.currentPriority.label).toContain("0300");
    expect(MS_PAINTING_V2_PROGRESS_STATUS.knownBlockers).toHaveLength(4);
  });
});

describe("packageStateBadgeTone", () => {
  it("maps filing states to distinct badge tones", () => {
    expect(packageStateBadgeTone("FILED")).toBe("green");
    expect(packageStateBadgeTone("MISSING")).toBe("steel");
    expect(packageStateBadgeTone("BLOCKED")).toBe("red");
    expect(packageStateBadgeTone("DRAFT")).toBe("blue");
  });
});

describe("subsystemStateBadgeTone", () => {
  it("maps subsystem states to distinct badge tones", () => {
    expect(subsystemStateBadgeTone("OPERATIONAL")).toBe("green");
    expect(subsystemStateBadgeTone("DEGRADED")).toBe("orange");
    expect(subsystemStateBadgeTone("CONFIG ONLY")).toBe("yellow");
    expect(subsystemStateBadgeTone("NOT LIVE")).toBe("red");
  });
});
