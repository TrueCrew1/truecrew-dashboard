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
}

function extractFrontmatterField(frontmatterBlock: string, key: string): string {
  const match = frontmatterBlock.match(new RegExp(`^${key}:\\s?(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function extractSection(body: string, heading: string): string {
  const match = body.match(new RegExp(`## ${heading}\\s*\\n\\s*([\\s\\S]*?)(?=\\n##|\\n*$)`));
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

  return {
    title: extractFrontmatterField(frontmatterBlock, "title") || repoPath,
    origin: extractSection(body, "Origin"),
    summary: truncate(extractSection(body, "Raw summary"), 220),
    createdDate,
    path: repoPath,
  };
}

/** Most recent knowledge/sources/ note by its `created` frontmatter date; null if none parse. */
export function getLatestResearchSummary(): LatestResearchSummary | null {
  const notes = Object.entries(SOURCE_NOTE_MODULES)
    .map(([modulePath, raw]) => {
      const repoPath = modulePath.replace(/^.*(knowledge\/sources\/)/, "$1");
      return parseSourceNote(raw, repoPath);
    })
    .filter((note): note is LatestResearchSummary => note !== null)
    .sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : a.path < b.path ? 1 : -1));

  return notes[0] ?? null;
}
