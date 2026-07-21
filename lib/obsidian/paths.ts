const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

// Knowledge Architecture V1 [M]: no em-dashes in filenames — they get mistyped
// and wikilinks break silently. Normalize to a plain hyphen instead.
const EM_DASH = /—/g;

export function sanitizeFilenameSegment(value: string): string {
  return value
    .replace(EM_DASH, "-")
    .replace(INVALID_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rolling append-only logs */
export const ROLLING_LOG_PATHS = {
  build: "Operations/Logs/Build Log.md",
  pr: "Operations/Logs/PR Log.md",
} as const;

/** Single-file context note — overwritten on each update */
export const HOT_CONTEXT_PATH = "True Crew/Hot Context.md";

/**
 * Knowledge Architecture V1 decisions folder. Legacy path was `Decisions/` at
 * vault root with an em-dash filename separator — deprecated, see
 * docs/FILE_SECOND_BRAIN_KNOWLEDGE_ARCHITECTURE_V1.md.
 */
export const DECISIONS_DIR = "True Crew/05-Decisions";

/** V1 spec pattern: `True Crew/05-Decisions/YYYY-MM-DD - <slug>.md` (space-hyphen-space). */
export function decisionNotePath(title: string, loggedAt = new Date()): string {
  const date = loggedAt.toISOString().slice(0, 10);
  const slug = sanitizeFilenameSegment(title);
  return `${DECISIONS_DIR}/${date} - ${slug}.md`;
}
