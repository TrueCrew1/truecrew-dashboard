#!/usr/bin/env node
/**
 * Deterministic scaffold for a knowledge/sources/ note documenting a Research
 * finding. No AI: this only assembles frontmatter and section headers from
 * data that already exists in the repo (src/lib/research/requests.ts,
 * src/lib/chief/workStories.ts). Raw summary / Extracted facts / Processed
 * into are always left blank for a human (or a future real Research pass) to
 * fill in by hand.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { RESEARCH_REQUESTS } from "../src/lib/research/requests";
import { WORK_STORIES } from "../src/lib/chief/workStories";

const SOURCES_DIR = path.join(process.cwd(), "knowledge", "sources");

function usage(): string {
  return `Scaffold a knowledge/sources/ note for a Research finding (no AI, deterministic).

Usage:
  npm run research:file -- --request-id <id>
  npm run research:file -- --title <text>

Exactly one of --request-id or --title is required.
  --request-id  Look up the topic/whyItMatters in src/lib/research/requests.ts, and the
                matching work_story_id (if any) in src/lib/chief/workStories.ts.
  --title       File a freeform note not tied to a queued request; work_story_id is omitted.

Refuses to overwrite an existing file. Leaves every body section but "Origin" blank --
fill in Raw summary / Extracted facts / Processed into by hand afterward.
`;
}

function parseArgs(argv: string[]): { requestId?: string; title?: string } {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    flags.set(key, next);
    i += 1;
  }

  const requestId = flags.get("request-id");
  const title = flags.get("title");
  if (!requestId && !title) {
    throw new Error("Provide exactly one of --request-id or --title.");
  }
  if (requestId && title) {
    throw new Error("Provide exactly one of --request-id or --title, not both.");
  }
  return { requestId, title };
}

/** Matches the existing knowledge/sources/*.md filename convention exactly. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Same plain, unescaped key: value style as lib/obsidian/templates.ts's
 * yamlFrontmatter() -- deliberately not a real YAML writer, matching the
 * repo's existing precedent rather than adding a new dependency. */
function yamlFrontmatter(fields: Array<[string, string]>): string {
  const lines = fields.map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

async function fileExists(target: string): Promise<boolean> {
  return fs
    .access(target)
    .then(() => true)
    .catch(() => false);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  const { requestId, title: rawTitle } = parseArgs(args);

  let title: string;
  let workStoryId: string | undefined;
  let originLine: string | undefined;

  if (requestId) {
    const request = RESEARCH_REQUESTS.find((r) => r.id === requestId);
    if (!request) {
      throw new Error(`No ResearchRequest with id "${requestId}" in src/lib/research/requests.ts`);
    }
    title = request.topic;
    const story = WORK_STORIES.find((s) => s.researchRequestId === requestId);
    workStoryId = story?.id;
    originLine = `Chief Research queue request \`${request.id}\` — ${request.whyItMatters}`;
  } else {
    title = rawTitle!.trim();
    if (!title) throw new Error("--title cannot be empty");
  }

  const slug = slugify(title);
  if (!slug) throw new Error(`Title "${title}" produced an empty slug.`);

  const targetPath = path.join(SOURCES_DIR, `${slug}.md`);
  if (await fileExists(targetPath)) {
    throw new Error(`Refusing to overwrite: ${targetPath} already exists.`);
  }

  const now = new Date().toISOString();
  const frontmatterFields: Array<[string, string]> = [
    ["title", title],
    ["type", "source"],
    ["status", "raw"],
    ["created", now],
    ["updated", now],
  ];
  if (workStoryId) {
    frontmatterFields.push(["work_story_id", workStoryId]);
  }
  frontmatterFields.push(
    ["related_pages", "[]"],
    ["related_prs", "[]"],
    ["related_cards", "[]"],
  );

  const bodyLines: string[] = [`# ${title}`, "", "## Origin", ""];
  if (originLine) {
    bodyLines.push(originLine, "");
  }
  bodyLines.push("## Raw summary", "", "## Extracted facts", "", "## Processed into", "");

  const content = yamlFrontmatter(frontmatterFields) + bodyLines.join("\n");

  await fs.mkdir(SOURCES_DIR, { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");

  console.log(`Wrote ${path.relative(process.cwd(), targetPath)}`);
  if (workStoryId) {
    console.log(`work_story_id: ${workStoryId}`);
  } else if (requestId) {
    console.log(`No matching WorkStoryDefinition for "${requestId}" -- work_story_id omitted.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
