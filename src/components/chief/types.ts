export type ChiefSpecialist =
  | "Workflow Gate Agent"
  | "Librarian Agent"
  | "Monitor Agent"
  | "Chief";

export interface ChiefResponse {
  summary: string;
  blockers?: string[];
  recommendedAction: string;
  approvalNeeded?: boolean;
  approvalPrompt?: string;
  routedTo: ChiefSpecialist;
}
