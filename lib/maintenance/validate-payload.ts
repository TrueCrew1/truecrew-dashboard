import type { MaintenanceInputKind, MaintenanceTaskPayload } from "../runtime/types.js";
import { isRecord } from "../librarian/validate-payload.js";

export function validateMaintenanceTaskPayload(payload: unknown): MaintenanceTaskPayload {
  if (!isRecord(payload)) {
    throw new Error("maintenance_task payload must be an object");
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";

  if (!title) throw new Error("maintenance_task payload requires title");
  if (!description) throw new Error("maintenance_task payload requires description");

  const context =
    typeof payload.context === "string" && payload.context.trim()
      ? payload.context.trim()
      : undefined;
  const notes =
    typeof payload.notes === "string" && payload.notes.trim() ? payload.notes.trim() : undefined;
  const workOrderId =
    typeof payload.workOrderId === "string" && payload.workOrderId.trim()
      ? payload.workOrderId.trim()
      : undefined;

  return { title, description, context, notes, workOrderId };
}

export function validateMaintenanceInputPayload(
  inputKind: MaintenanceInputKind,
  payload: unknown,
): MaintenanceTaskPayload {
  if (inputKind !== "maintenance_task") {
    throw new Error(`Unsupported maintenance input_kind: ${inputKind}`);
  }
  return validateMaintenanceTaskPayload(payload);
}
