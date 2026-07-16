import type { Note } from "../../src/types";

/**
 * Displays "maintenance" whenever a note's agent is the Maintenance agent,
 * regardless of whether the underlying value is the DB's compat "ticket"
 * type or the vault's real "maintenance" type (see #97/#98) — so the two
 * sinks read consistently in the Knowledge view without changing either
 * persisted value.
 */
export function displayNoteType(entry: {
  type: Note["type"] | "maintenance";
  agent?: Note["agent"];
}): string {
  if (entry.agent === "maintenance") return "maintenance";
  return entry.type;
}
