import type { Artifact, Persona, WorkItem } from "../../src/types";

export type { Artifact, WorkItem };

export interface CreateMaintenanceNoteInput {
  taskId: string;
  actor?: Persona;
}

export interface CreateMaintenanceNoteResult {
  workItem: WorkItem;
  note: Artifact;
  vaultWritten: boolean;
}
