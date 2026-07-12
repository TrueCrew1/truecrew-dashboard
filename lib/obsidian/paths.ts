const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFilenameSegment(value: string): string {
  return value.replace(INVALID_FILENAME_CHARS, "").replace(/\s+/g, " ").trim();
}

/** Rolling append-only logs */
export const ROLLING_LOG_PATHS = {
  build: "Operations/Logs/Build Log.md",
  pr: "Operations/Logs/PR Log.md",
} as const;

/** Single-file context note — overwritten on each update */
export const HOT_CONTEXT_PATH = "True Crew/Hot Context.md";

export function decisionNotePath(title: string, loggedAt = new Date()): string {
  const date = loggedAt.toISOString().slice(0, 10);
  const safeTitle = sanitizeFilenameSegment(title);
  return `Decisions/${date} — ${safeTitle}.md`;
}

export function maintenanceNotePath(title: string, loggedAt = new Date()): string {
  const date = loggedAt.toISOString().slice(0, 10);
  const safeTitle = sanitizeFilenameSegment(title);
  return `Operations/Maintenance/${date} — ${safeTitle}.md`;
}

export function planningNotePath(title: string, loggedAt = new Date()): string {
  const date = loggedAt.toISOString().slice(0, 10);
  const safeTitle = sanitizeFilenameSegment(title);
  return `Operations/Planning/${date} — ${safeTitle}.md`;
}

export function researchFindingNotePath(title: string, loggedAt = new Date()): string {
  const date = loggedAt.toISOString().slice(0, 10);
  const safeTitle = sanitizeFilenameSegment(title);
  return `Research/${date} — ${safeTitle}.md`;
}
