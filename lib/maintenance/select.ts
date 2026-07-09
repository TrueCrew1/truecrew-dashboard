import type { Note } from "../../src/types";

/**
 * Maintenance-only counterpart to the Librarian `noteToArtifact` gate.
 * Kept as a standalone predicate so maintenance notes can be selected without
 * flowing through the Librarian artifact path (which gates on `agent === "librarian"`).
 */
export function isMaintenanceNote(note: Note): boolean {
  return note.agent === "maintenance";
}

/**
 * Return the maintenance note linked to a task, or null if none exists.
 * Links via the same `sourceTaskId` / `workItemId` fields the Librarian selector uses.
 */
export function selectTaskMaintenanceNote(notes: Note[], taskId: string): Note | null {
  return (
    notes.find(
      (note) =>
        isMaintenanceNote(note) &&
        (note.workItemId === taskId || note.sourceTaskId === taskId),
    ) ?? null
  );
}
