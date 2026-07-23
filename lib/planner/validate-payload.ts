import type { PlannerTaskPayload } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validatePlannerTaskPayload(payload: unknown): PlannerTaskPayload {
  if (!isRecord(payload)) {
    throw new Error("inputPayload must be an object");
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";

  if (!title) throw new Error("inputPayload requires title");
  if (!description) throw new Error("inputPayload requires description");

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
