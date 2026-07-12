import { describe, expect, it } from "vitest";
import { validatePlannerWorkItemInput } from "./validate-payload.js";

describe("validatePlannerWorkItemInput", () => {
  it("accepts a minimal valid payload and applies no defaults itself", () => {
    const result = validatePlannerWorkItemInput({ title: "Ship the thing" });
    expect(result).toEqual({ title: "Ship the thing" });
  });

  it("accepts a full valid payload", () => {
    const result = validatePlannerWorkItemInput({
      title: "Ship the thing",
      description: "Full details",
      status: "in_progress",
      priority: "high",
      assignee: "marcus",
      dueDate: "2026-08-01T00:00:00.000Z",
    });
    expect(result).toEqual({
      title: "Ship the thing",
      description: "Full details",
      status: "in_progress",
      priority: "high",
      assignee: "marcus",
      dueDate: "2026-08-01T00:00:00.000Z",
    });
  });

  it("throws when body is not an object", () => {
    expect(() => validatePlannerWorkItemInput(null)).toThrow("Request body must be an object");
    expect(() => validatePlannerWorkItemInput("nope")).toThrow("Request body must be an object");
    expect(() => validatePlannerWorkItemInput([])).toThrow("Request body must be an object");
  });

  it("throws when title is missing or whitespace-only", () => {
    expect(() => validatePlannerWorkItemInput({})).toThrow("title is required");
    expect(() => validatePlannerWorkItemInput({ title: "   " })).toThrow("title is required");
  });

  it("throws on an invalid status", () => {
    expect(() => validatePlannerWorkItemInput({ title: "x", status: "archived" })).toThrow(
      "status must be one of: new, in_progress, blocked, done",
    );
  });

  it("throws on an invalid priority", () => {
    expect(() => validatePlannerWorkItemInput({ title: "x", priority: "urgent" })).toThrow(
      "priority must be one of: low, medium, high",
    );
  });

  it("throws on a non-string assignee", () => {
    expect(() => validatePlannerWorkItemInput({ title: "x", assignee: 5 })).toThrow(
      "assignee must be a string",
    );
  });

  it("accepts an ISO 8601 date-only dueDate", () => {
    const result = validatePlannerWorkItemInput({ title: "x", dueDate: "2026-08-01" });
    expect(result.dueDate).toBe("2026-08-01");
  });

  it("throws on a non-ISO but Date-parseable dueDate", () => {
    expect(() =>
      validatePlannerWorkItemInput({ title: "x", dueDate: "January 1 2026" }),
    ).toThrow("dueDate must be a valid ISO 8601 date or date-time");
  });

  it("throws on a garbage dueDate", () => {
    expect(() => validatePlannerWorkItemInput({ title: "x", dueDate: "not-a-date" })).toThrow(
      "dueDate must be a valid ISO 8601 date or date-time",
    );
  });
});
