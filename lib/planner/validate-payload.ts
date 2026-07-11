import type { PlannerInputKind, PlannerTaskPayload } from "../runtime/types.js";
import { isRecord } from "../librarian/validate-payload.js";

export function validatePlannerTaskPayload(payload: unknown): PlannerTaskPayload {
  if (!isRecord(payload)) {
    throw new Error("planning_task payload must be an object");
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";

  if (!title) throw new Error("planning_task payload requires title");
  if (!description) throw new Error("planning_task payload requires description");

  const context =
    typeof payload.context === "string" && payload.context.trim()
      ? payload.context.trim()
      : undefined;
  const notes =
    typeof payload.notes === "string" && payload.notes.trim() ? payload.notes.trim() : undefined;
  const proposalId =
    typeof payload.proposalId === "string" && payload.proposalId.trim()
      ? payload.proposalId.trim()
      : undefined;

  return { title, description, context, notes, proposalId };
}

export function validatePlannerInputPayload(
  inputKind: PlannerInputKind,
  payload: unknown,
): PlannerTaskPayload {
  if (inputKind !== "planning_task") {
    throw new Error(`Unsupported planner input_kind: ${inputKind}`);
  }
  return validatePlannerTaskPayload(payload);
}
