import type { Task } from "../../src/types";
import type { ArtifactDraft } from "./types";
import { workflowTypeToNoteType } from "./types";

function truncate(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function deterministicArtifactDraft(task: Task): ArtifactDraft {
  const noteType = workflowTypeToNoteType(task.workflowType);
  const summarySource =
    task.description?.trim() ||
    task.blocker?.trim() ||
    `${task.workflowType} work item at stage ${task.stage}.`;

  const tags = [
    task.workflowType,
    task.stage.toLowerCase().replace(/\s+/g, "-"),
    "librarian",
  ];

  if (task.priority === "critical" || task.priority === "high") {
    tags.push(task.priority);
  }

  return {
    title: `${task.title} — work record`,
    summary: truncate(summarySource, 240),
    tags,
    pathSegment: task.title,
    noteType,
  };
}
