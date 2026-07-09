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

  it("rejects whitespace-only title as missing", () => {
    expect(() =>
      validateChiefDecisionPayload({
        title: "   ",
        decision: "Approved",
      }),
    ).toThrow(/title/);
  });

  it("rejects whitespace-only decision as missing", () => {
    expect(() =>
      validateChiefDecisionPayload({
        title: "Test",
        decision: "   ",
      }),
    ).toThrow(/decision/);
  });

  it("trims and passes through context, consequences, and proposalId when present", () => {
    expect(
      validateChiefDecisionPayload({
        title: "  Override gates for tsk-001  ",
        decision: "  Approved. Document reason and advance.  ",
        context: "  Build task has open gates.  ",
        consequences: "  Task advances without a fresh review.  ",
        proposalId: "  apr-1  ",
      }),
    ).toEqual({
      title: "Override gates for tsk-001",
      decision: "Approved. Document reason and advance.",
      context: "Build task has open gates.",
      consequences: "Task advances without a fresh review.",
      proposalId: "apr-1",
    });
  });
});

describe("validateLibrarianInputPayload", () => {
  it("delegates to validateChiefDecisionPayload for chief_decision input", () => {
    expect(() => validateLibrarianInputPayload("chief_decision" as const, null)).toThrow();
  });

  it("rejects an unsupported input_kind", () => {
    expect(() =>
      validateLibrarianInputPayload("maintenance_task" as never, {
        title: "Test",
        decision: "Approved",
      }),
    ).toThrow(/Unsupported librarian input_kind: maintenance_task/);
  });
});
