/**
 * Read-only, build-time view of knowledge/sources/*.md for Chief. Vite inlines these
 * files as raw strings at build/dev time (import.meta.glob) — no server, no new API
 * route, no runtime filesystem access from the browser.
 */
const SOURCE_NOTE_MODULES = import.meta.glob("../../../knowledge/sources/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface LatestResearchSummary {
  title: string;
  origin: string;
  summary: string;
  createdDate: string;
  /** Repo-relative path, for traceability only. */
  path: string;
  /** WorkStoryDefinition.id this note was filed for, if any — absent on older/unlinked notes. */
  workStoryId?: string;
}

function extractFrontmatterField(frontmatterBlock: string, key: string): string {
  const match = frontmatterBlock.match(new RegExp(`^${key}:\\s?(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function extractSection(body: string, heading: string): string {
  // Only the heading line's own trailing whitespace is skipped before the
  // required line break ([ \t]*\n) -- unlike \s*\n\s*, this never also
  // swallows the blank line that follows. That blank line has to stay
  // available for the (?=\n##|\n*$) lookahead below: for a genuinely empty
  // section (no content before the next heading), it's the only thing that
  // lets the lazy capture match zero characters instead of being forced to
  // expand past the next "## Heading" line looking for a \n it can match
  // against, which is what made an empty section render as the next
  // section's heading text.
  const match = body.match(new RegExp(`## ${heading}[ \\t]*\\n([\\s\\S]*?)(?=\\n##|\\n*$)`));
  return match?.[1]?.trim() ?? "";
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

function parseSourceNote(raw: string, repoPath: string): LatestResearchSummary | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) return null;
  const [, frontmatterBlock, body] = match;

  if (extractFrontmatterField(frontmatterBlock, "type") !== "source") return null;

  const createdDate = extractFrontmatterField(frontmatterBlock, "created");
  if (!createdDate) return null;

  const workStoryId = extractFrontmatterField(frontmatterBlock, "work_story_id");

  return {
    title: extractFrontmatterField(frontmatterBlock, "title") || repoPath,
    origin: extractSection(body, "Origin"),
    summary: truncate(extractSection(body, "Raw summary"), 220),
    createdDate,
    path: repoPath,
    workStoryId: workStoryId || undefined,
  };
}

/** All parsed knowledge/sources/ notes, most recent (`created`) first. */
export function getAllResearchSummaries(): LatestResearchSummary[] {
  return Object.entries(SOURCE_NOTE_MODULES)
    .map(([modulePath, raw]) => {
      const repoPath = modulePath.replace(/^.*(knowledge\/sources\/)/, "$1");
      return parseSourceNote(raw, repoPath);
    })
    .filter((note): note is LatestResearchSummary => note !== null)
    .sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : a.path < b.path ? 1 : -1));
}

/** Most recent knowledge/sources/ note by its `created` frontmatter date; null if none parse. */
export function getLatestResearchSummary(): LatestResearchSummary | null {
  return getAllResearchSummaries()[0] ?? null;
}

/**
 * Most recent filed note whose title contains `titleSubstring` (case-insensitive).
 * Kept as a compatibility fallback for notes filed before `work_story_id` existed —
 * prefer findLatestResearchSummaryByWorkStoryId when a note might carry that field.
 */
export function findLatestResearchSummaryByTitle(titleSubstring: string): LatestResearchSummary | null {
  const needle = titleSubstring.toLowerCase();
  return getAllResearchSummaries().find((note) => note.title.toLowerCase().includes(needle)) ?? null;
}

/**
 * Most recent filed note carrying this exact `work_story_id` — the stable,
 * non-fuzzy way a Work Story resolves "its" latest research. Returns null if no
 * note has been filed with this id yet (including for notes filed before this
 * field existed).
 */
export function findLatestResearchSummaryByWorkStoryId(workStoryId: string): LatestResearchSummary | null {
  return getAllResearchSummaries().find((note) => note.workStoryId === workStoryId) ?? null;
}
