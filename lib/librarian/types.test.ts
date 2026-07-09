import { describe, expect, it } from "vitest";
import type { WorkflowType } from "../../src/types";
import { workflowTypeToNoteType } from "./types";

describe("workflowTypeToNoteType", () => {
  it("maps each known workflow type to its note category", () => {
    const cases: Array<[WorkflowType, string]> = [
      ["build", "build"],
      ["deploy", "deploy"],
      ["repair", "incident"],
      ["ticket", "ticket"],
      ["onboarding", "onboarding"],
      ["decision", "decision"],
    ];

    for (const [workflowType, expected] of cases) {
      expect(workflowTypeToNoteType(workflowType)).toBe(expected);
    }
  });

  it("falls back to 'ticket' for an unrecognized workflow type", () => {
    expect(workflowTypeToNoteType("mystery" as WorkflowType)).toBe("ticket");
  });
});
