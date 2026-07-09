import { describe, expect, it } from "vitest";
import {
  validateChiefDecisionPayload,
  validateLibrarianInputPayload,
} from "./validate-payload.js";

describe("validateChiefDecisionPayload", () => {
  it("accepts a minimal valid payload", () => {
    expect(
      validateChiefDecisionPayload({
        title: "Override gates for tsk-001",
        decision: "Approved. Document reason and advance.",
        context: "Build task has open gates.",
      }),
    ).toEqual({
      title: "Override gates for tsk-001",
      decision: "Approved. Document reason and advance.",
      context: "Build task has open gates.",
      consequences: undefined,
      proposalId: undefined,
    });
  });

  it("rejects missing title", () => {
    expect(() =>
      validateChiefDecisionPayload({
        decision: "Approved",
      }),
    ).toThrow(/title/);
  });

  it("rejects missing decision", () => {
    expect(() =>
      validateChiefDecisionPayload({
        title: "Test",
      }),
    ).toThrow(/decision/);
  });
});

describe("validateLibrarianInputPayload", () => {
  it("only supports chief_decision in v1", () => {
    expect(() => validateLibrarianInputPayload("chief_decision" as const, null)).toThrow();
  });
});
