import { describe, expect, it } from "vitest";
import {
  validatePlannerInputPayload,
  validatePlannerTaskPayload,
} from "./validate-payload.js";

describe("validatePlannerTaskPayload", () => {
  it("accepts a minimal valid payload", () => {
    expect(
      validatePlannerTaskPayload({
        title: "Start Phase 4 — Alerts & Escalation",
        description: "Kick off urgency buckets and inline tags on pending approvals.",
        context: "Phase 3 (Persistence) has shipped.",
      }),
    ).toEqual({
      title: "Start Phase 4 — Alerts & Escalation",
      description: "Kick off urgency buckets and inline tags on pending approvals.",
      context: "Phase 3 (Persistence) has shipped.",
      notes: undefined,
      proposalId: undefined,
    });
  });

  it("rejects missing title", () => {
    expect(() =>
      validatePlannerTaskPayload({
        description: "Kick off Phase 4",
      }),
    ).toThrow(/title/);
  });

  it("rejects missing description", () => {
    expect(() =>
      validatePlannerTaskPayload({
        title: "Test",
      }),
    ).toThrow(/description/);
  });

  it("rejects whitespace-only title as missing", () => {
    expect(() =>
      validatePlannerTaskPayload({
        title: "   ",
        description: "Kick off Phase 4",
      }),
    ).toThrow(/title/);
  });

  it("rejects whitespace-only description as missing", () => {
    expect(() =>
      validatePlannerTaskPayload({
        title: "Test",
        description: "   ",
      }),
    ).toThrow(/description/);
  });

  it("rejects a non-object payload", () => {
    expect(() => validatePlannerTaskPayload(null)).toThrow(
      /planning_task payload must be an object/,
    );
  });

  it("trims and passes through context, notes, and proposalId when present", () => {
    expect(
      validatePlannerTaskPayload({
        title: "  Start Phase 4 — Alerts & Escalation  ",
        description: "  Kick off urgency buckets and inline tags on pending approvals.  ",
        context: "  Phase 3 (Persistence) has shipped.  ",
        notes: "  Coordinate with Build on scheduling.  ",
        proposalId: "  apr-planner-example-phase4  ",
      }),
    ).toEqual({
      title: "Start Phase 4 — Alerts & Escalation",
      description: "Kick off urgency buckets and inline tags on pending approvals.",
      context: "Phase 3 (Persistence) has shipped.",
      notes: "Coordinate with Build on scheduling.",
      proposalId: "apr-planner-example-phase4",
    });
  });
});

describe("validatePlannerInputPayload", () => {
  it("delegates to validatePlannerTaskPayload for planning_task input", () => {
    expect(() => validatePlannerInputPayload("planning_task" as const, null)).toThrow(
      /planning_task payload must be an object/,
    );
  });

  it("rejects an unsupported input_kind", () => {
    expect(() =>
      validatePlannerInputPayload("chief_decision" as never, {
        title: "Test",
        description: "Kick off Phase 4",
      }),
    ).toThrow(/Unsupported planner input_kind: chief_decision/);
  });
});
