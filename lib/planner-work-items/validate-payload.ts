import {
  PLANNER_WORK_ITEM_PRIORITIES,
  PLANNER_WORK_ITEM_STATUSES,
  type PlannerWorkItemInput,
  type PlannerWorkItemPriority,
  type PlannerWorkItemStatus,
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: string): value is PlannerWorkItemStatus {
  return (PLANNER_WORK_ITEM_STATUSES as readonly string[]).includes(value);
}

function isPriority(value: string): value is PlannerWorkItemPriority {
  return (PLANNER_WORK_ITEM_PRIORITIES as readonly string[]).includes(value);
}

// Matches ISO 8601 date or date-time (optionally with fractional seconds and
// a Z/offset suffix). Rejects loosely-parseable non-ISO strings that
// `Date.parse` would otherwise accept (e.g. "January 1 2020").
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

function isIso8601(value: string): boolean {
  return ISO_8601_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());
}

/** Validates a create-work-item request body against the planner_work_items schema. */
export function validatePlannerWorkItemInput(payload: unknown): PlannerWorkItemInput {
  if (!isRecord(payload)) {
    throw new Error("Request body must be an object");
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) throw new Error("title is required");

  let description: string | undefined;
  if (payload.description !== undefined && payload.description !== null) {
    if (typeof payload.description !== "string") {
      throw new Error("description must be a string");
    }
    description = payload.description.trim() || undefined;
  }

  let status: PlannerWorkItemStatus | undefined;
  if (payload.status !== undefined && payload.status !== null) {
    if (typeof payload.status !== "string" || !isStatus(payload.status)) {
      throw new Error(`status must be one of: ${PLANNER_WORK_ITEM_STATUSES.join(", ")}`);
    }
    status = payload.status;
  }

  let priority: PlannerWorkItemPriority | undefined;
  if (payload.priority !== undefined && payload.priority !== null) {
    if (typeof payload.priority !== "string" || !isPriority(payload.priority)) {
      throw new Error(`priority must be one of: ${PLANNER_WORK_ITEM_PRIORITIES.join(", ")}`);
    }
    priority = payload.priority;
  }

  let assignee: string | undefined;
  if (payload.assignee !== undefined && payload.assignee !== null) {
    if (typeof payload.assignee !== "string") {
      throw new Error("assignee must be a string");
    }
    assignee = payload.assignee.trim() || undefined;
  }

  let dueDate: string | undefined;
  if (payload.dueDate !== undefined && payload.dueDate !== null) {
    if (typeof payload.dueDate !== "string") {
      throw new Error("dueDate must be a string");
    }
    if (!isIso8601(payload.dueDate)) {
      throw new Error("dueDate must be a valid ISO 8601 date or date-time");
    }
    dueDate = payload.dueDate;
  }

  return { title, description, status, priority, assignee, dueDate };
}
