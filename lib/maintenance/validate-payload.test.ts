import { describe, expect, it } from "vitest";
import {
  validateMaintenanceInputPayload,
  validateMaintenanceTaskPayload,
} from "./validate-payload.js";

describe("validateMaintenanceTaskPayload", () => {
  it("accepts a minimal valid payload", () => {
    expect(
      validateMaintenanceTaskPayload({
        title: "Replace HVAC filter — Unit 4",
        description: "Filter is past its service interval, swap for a MERV-13.",
        context: "Flagged during weekly walkthrough.",
      }),
    ).toEqual({
      title: "Replace HVAC filter — Unit 4",
      description: "Filter is past its service interval, swap for a MERV-13.",
      context: "Flagged during weekly walkthrough.",
      notes: undefined,
      workOrderId: undefined,
    });
  });

  it("rejects missing title", () => {
    expect(() =>
      validateMaintenanceTaskPayload({
        description: "Swap the filter",
      }),
    ).toThrow(/title/);
  });

  it("rejects missing description", () => {
    expect(() =>
      validateMaintenanceTaskPayload({
        title: "Test",
      }),
    ).toThrow(/description/);
  });

  it("rejects whitespace-only title as missing", () => {
    expect(() =>
      validateMaintenanceTaskPayload({
        title: "   ",
        description: "Swap the filter",
      }),
    ).toThrow(/title/);
  });

  it("rejects whitespace-only description as missing", () => {
    expect(() =>
      validateMaintenanceTaskPayload({
        title: "Test",
        description: "   ",
      }),
    ).toThrow(/description/);
  });

  it("rejects a non-object payload", () => {
    expect(() => validateMaintenanceTaskPayload(null)).toThrow(
      /maintenance_task payload must be an object/,
    );
  });

  it("trims and passes through context, notes, and workOrderId when present", () => {
    expect(
      validateMaintenanceTaskPayload({
        title: "  Replace HVAC filter — Unit 4  ",
        description: "  Filter is past its service interval, swap for a MERV-13.  ",
        context: "  Flagged during weekly walkthrough.  ",
        notes: "  Bring a spare belt too.  ",
        workOrderId: "  wo-482  ",
      }),
    ).toEqual({
      title: "Replace HVAC filter — Unit 4",
      description: "Filter is past its service interval, swap for a MERV-13.",
      context: "Flagged during weekly walkthrough.",
      notes: "Bring a spare belt too.",
      workOrderId: "wo-482",
    });
  });
});

describe("validateMaintenanceInputPayload", () => {
  it("delegates to validateMaintenanceTaskPayload for maintenance_task input", () => {
    expect(() => validateMaintenanceInputPayload("maintenance_task" as const, null)).toThrow(
      /maintenance_task payload must be an object/,
    );
  });

  it("rejects an unsupported input_kind", () => {
    expect(() =>
      validateMaintenanceInputPayload("chief_decision" as never, {
        title: "Test",
        description: "Swap the filter",
      }),
    ).toThrow(/Unsupported maintenance input_kind: chief_decision/);
  });
});
