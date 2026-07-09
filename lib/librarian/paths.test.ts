import { describe, expect, it } from "vitest";
import type { ArtifactDraft } from "./types";
import { artifactNotePath } from "./paths";

const draft: ArtifactDraft = {
  title: "Pump: station telemetry?",
  summary: "s",
  tags: [],
  pathSegment: "Pump: station telemetry?",
  noteType: "incident",
};

describe("artifactNotePath", () => {
  it("prefixes the ISO date and sanitizes the segment", () => {
    const path = artifactNotePath(draft, new Date("2026-07-04T12:00:00.000Z"));
    expect(path).toBe("Operations/Artifacts/2026-07-04 — Pump station telemetry.md");
  });

  it("falls back to the title when pathSegment is empty", () => {
    const path = artifactNotePath(
      { ...draft, pathSegment: "", title: "Fallback title" },
      new Date("2026-07-04T00:00:00.000Z"),
    );
    expect(path).toBe("Operations/Artifacts/2026-07-04 — Fallback title.md");
  });
});
