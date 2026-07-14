import fs from "node:fs";
import path from "node:path";

/**
 * One structured Research finding — bounded, single shape. Raw and unprocessed by
 * design: this is the knowledge/sources/ layer (see source-template.md), not a
 * synthesized concept/project/decision page.
 */
export interface ResearchFinding {
  /** Note title / vault topic — becomes the frontmatter title and H1. */
  topic: string;
  /** Where this finding came from — a task, PR, doc section, or external source. */
  origin: string;
  /** Raw, close-to-verbatim summary — no editorializing. */
  summary: string;
  /** Specific, checkable claims worth carrying forward. */
  facts: string[];
  /** What should happen with this finding next (which concept/project it might feed). */
  nextStep: string;
  /** Existing knowledge/ page slugs this relates to, if any. */
  relatedPages?: string[];
  /**
   * Stable WorkStoryDefinition.id (src/lib/chief/workStories.ts) this finding
   * belongs to, if any — lets Chief resolve "latest research for this story" by
   * id instead of fuzzy title matching. Omitted entirely from frontmatter for
   * findings that aren't tied to a Work Story.
   */
  workStoryId?: string;
}

const KNOWLEDGE_SOURCES_DIR = path.join(process.cwd(), "knowledge", "sources");

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Filing destination for a finding — knowledge/sources/, matching the existing shelf's plain-slug naming. */
export function researchFindingPath(finding: ResearchFinding): string {
  return path.join(KNOWLEDGE_SOURCES_DIR, `${slugify(finding.topic)}.md`);
}

/** Renders the note using the same frontmatter/section shape as knowledge/templates/source-template.md. */
export function renderResearchFindingNote(finding: ResearchFinding, filedAt = new Date()): string {
  // Full timestamp, not just a date: same-day filings are a real, expected case
  // once more than one finding lands per day, and Chief's "latest research"
  // panel needs to be able to tell them apart.
  const timestamp = filedAt.toISOString();

  const frontmatter = [
    "---",
    `title: ${finding.topic}`,
    "type: source",
    "status: raw",
    `created: ${timestamp}`,
    `updated: ${timestamp}`,
    ...(finding.workStoryId ? [`work_story_id: ${finding.workStoryId}`] : []),
    `related_pages: [${(finding.relatedPages ?? []).join(", ")}]`,
    "related_prs: []",
    "related_cards: []",
    "---",
    "",
    "",
  ].join("\n");

  const body = [
    `# ${finding.topic}`,
    "",
    "## Origin",
    "",
    finding.origin,
    "",
    "## Raw summary",
    "",
    finding.summary,
    "",
    "## Extracted facts",
    "",
    ...finding.facts.map((fact) => `- ${fact}`),
    "",
    "## Processed into",
    "",
    `Not yet synthesized into a concept/project/decision page. Next step: ${finding.nextStep}`,
    "",
  ].join("\n");

  return frontmatter + body;
}

/** Writes the finding into knowledge/sources/ and returns the path written. */
export function fileResearchFinding(finding: ResearchFinding, filedAt = new Date()): string {
  const targetPath = researchFindingPath(finding);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, renderResearchFindingNote(finding, filedAt), "utf8");
  return targetPath;
}
