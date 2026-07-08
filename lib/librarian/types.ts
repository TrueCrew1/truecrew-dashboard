import type { Artifact, Persona, Task } from "../../src/types";

/** Work item in Librarian runtime — alias for Task (no separate DB table). */
export type WorkItem = Task;

export type { Artifact };

export type ArtifactRefinementSource = Artifact["refinementSource"];

export interface ArtifactDraft {
  title: string;
  summary: string;
  tags: string[];
  pathSegment: string;
  noteType: Artifact["type"];
}

export interface CreateArtifactInput {
  taskId: string;
  useAi?: boolean;
  actor?: Persona;
}

export interface CreateArtifactResult {
  artifact: Artifact;
  vaultWritten: boolean;
}

export function workflowTypeToNoteType(workflowType: Task["workflowType"]): Artifact["type"] {
  switch (workflowType) {
    case "build":
      return "build";
    case "deploy":
      return "deploy";
    case "repair":
      return "incident";
    case "ticket":
      return "ticket";
    case "onboarding":
      return "onboarding";
    case "decision":
      return "decision";
    default:
      return "ticket";
  }
}
