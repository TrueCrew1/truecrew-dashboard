import type { ChiefDecisionPayload, LibrarianInputKind } from "../runtime/types.js";

export interface ValidatedChiefDecisionPayload extends ChiefDecisionPayload {
  title: string;
  decision: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateChiefDecisionPayload(
  payload: unknown,
): ValidatedChiefDecisionPayload {
  if (!isRecord(payload)) {
    throw new Error("chief_decision payload must be an object");
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const decision = typeof payload.decision === "string" ? payload.decision.trim() : "";

  if (!title) throw new Error("chief_decision payload requires title");
  if (!decision) throw new Error("chief_decision payload requires decision");

  const context =
    typeof payload.context === "string" && payload.context.trim()
      ? payload.context.trim()
      : undefined;
  const consequences =
    typeof payload.consequences === "string" && payload.consequences.trim()
      ? payload.consequences.trim()
      : undefined;
  const proposalId =
    typeof payload.proposalId === "string" && payload.proposalId.trim()
      ? payload.proposalId.trim()
      : undefined;

  return { title, decision, context, consequences, proposalId };
}

export function validateLibrarianInputPayload(
  inputKind: LibrarianInputKind,
  payload: unknown,
): ValidatedChiefDecisionPayload {
  if (inputKind !== "chief_decision") {
    throw new Error(`Unsupported librarian input_kind: ${inputKind}`);
  }
  return validateChiefDecisionPayload(payload);
}
