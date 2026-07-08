import type { Artifact, Persona, Task, WorkItem } from "../../src/types";

export type { Artifact, WorkItem };

export type ArtifactRefinementSource = NonNullable<Artifact["refinementSource"]>;

export interface ArtifactDraft {
  title: string;
  summary: string;
  tags: string[];
  pathSegment: string;
  noteType: NoteCategory;
}

type NoteCategory = "build" | "deploy" | "incident" | "ticket" | "decision" | "onboarding";

export interface CreateArtifactInput {
  taskId: string;
  useAi?: boolean;
  actor?: Persona;
}

export interface CreateArtifactResult {
  workItem: WorkItem;
  artifact: Artifact;
  vaultWritten: boolean;
}

export function workflowTypeToNoteType(workflowType: Task["workflowType"]): NoteCategory {
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
