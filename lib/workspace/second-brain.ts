import fs from "node:fs/promises";
import path from "node:path";
import { sanitizeFilenameSegment } from "../obsidian/paths.js";
import { writeVaultNote } from "../obsidian/write.js";
import type {
  SourceNoteInput,
  SynthesisNoteInput,
  TopicNoteInput,
} from "./types.js";

const SOURCE_DIR = "Sources";
const TOPIC_DIR = "Topics";
const SYNTHESIS_DIR = "Synthesis";

/** Create a Sources/ note for a research-worthy file. Returns vault-relative path. */
export async function createSourceNote(
  input: SourceNoteInput,
  dryRun = false,
): Promise<string> {
  const title = titleFromFilename(input.filename);
  const relativePath = `${SOURCE_DIR}/${sanitizeFilenameSegment(title)}.md`;
  const tags = [
    "source",
    `bucket/${input.bucket}`,
    ...(input.theme ? [`theme/${input.theme}`] : []),
  ];

  const body = [
    "---",
    "type: source",
    "status: raw",
    `theme: ${input.theme ?? "unscoped"}`,
    `tags: [${tags.join(", ")}]`,
    `workspace_path: ${JSON.stringify(input.workspaceRelativePath)}`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    `# ${title}`,
    "",
    "## Origin",
    "",
    `- File: \`${input.filename}\``,
    `- Workspace path: \`${input.workspaceRelativePath}\``,
    `- Triage reason: ${input.reason}`,
    "",
    "## Raw summary",
    "",
    "_Pilot stub — fill in after reading the source._",
    "",
    "## Extracted facts",
    "",
    "- ",
    "",
    "## Links",
    "",
    input.theme
      ? `- Topic: [[${topicTitle(input.theme)}]]`
      : "- Topic: _(none yet)_",
    "",
  ].join("\n");

  if (!dryRun) {
    await writeVaultNote(relativePath, body);
  }

  return relativePath;
}

/** Ensure a Topics/ note exists and lists the given source titles. */
export async function upsertTopicNote(
  vaultRoot: string,
  input: TopicNoteInput,
  dryRun = false,
): Promise<string> {
  const title = topicTitle(input.theme);
  const relativePath = `${TOPIC_DIR}/${sanitizeFilenameSegment(title)}.md`;
  const absolutePath = path.join(vaultRoot, relativePath);

  const sourceLinks = input.sourceNoteTitles
    .map((name) => `- [[${name}]]`)
    .join("\n");

  let existingBody: string | null = null;
  try {
    existingBody = await fs.readFile(absolutePath, "utf8");
  } catch {
    existingBody = null;
  }

  if (existingBody) {
    const merged = mergeSourceLinks(existingBody, input.sourceNoteTitles);
    if (!dryRun && merged !== existingBody) {
      await writeVaultNote(relativePath, merged);
    }
    return relativePath;
  }

  const body = [
    "---",
    "type: topic",
    `theme: ${input.theme}`,
    `tags: [topic, theme/${input.theme}]`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    `# ${title}`,
    "",
    "## Why this topic exists",
    "",
    `Multiple sources share the theme \`${input.theme}\`.`,
    "",
    "## Sources",
    "",
    sourceLinks || "- _(none yet)_",
    "",
    "## Open questions",
    "",
    "- ",
    "",
    "## Synthesis",
    "",
    `- Draft: [[${synthesisTitle(input.theme)}]]`,
    "",
  ].join("\n");

  if (!dryRun) {
    await writeVaultNote(relativePath, body);
  }

  return relativePath;
}

/** Create a draft Synthesis/ note when a theme has enough sources. */
export async function createSynthesisDraft(
  input: SynthesisNoteInput,
  dryRun = false,
): Promise<string> {
  const title = synthesisTitle(input.theme);
  const relativePath = `${SYNTHESIS_DIR}/${sanitizeFilenameSegment(title)}.md`;

  const sourceLinks = input.sourceNoteTitles
    .map((name) => `- [[${name}]]`)
    .join("\n");

  const body = [
    "---",
    "type: synthesis",
    "status: draft",
    `theme: ${input.theme}`,
    `tags: [synthesis, draft, theme/${input.theme}]`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    `# ${title}`,
    "",
    "## Status",
    "",
    "Draft — enough sources exist to start a synthesis. Human edits before acting on it.",
    "",
    "## Topic",
    "",
    `- [[${input.topicNoteTitle}]]`,
    "",
    "## Sources considered",
    "",
    sourceLinks,
    "",
    "## Working synthesis",
    "",
    "_What do these sources say together? Facts first, then guesses._",
    "",
    "## Recommended next action",
    "",
    "- ",
    "",
  ].join("\n");

  if (!dryRun) {
    await writeVaultNote(relativePath, body);
  }

  return relativePath;
}

export function topicTitle(theme: string): string {
  return `Topic — ${humanizeTheme(theme)}`;
}

export function synthesisTitle(theme: string): string {
  return `Synthesis — ${humanizeTheme(theme)}`;
}

export function titleFromFilename(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "");
  return sanitizeFilenameSegment(stem) || "Untitled source";
}

function humanizeTheme(theme: string): string {
  return theme
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mergeSourceLinks(existingBody: string, sourceTitles: string[]): string {
  const missing = sourceTitles.filter(
    (title) => !existingBody.includes(`[[${title}]]`),
  );
  if (missing.length === 0) return existingBody;

  const addition = missing.map((title) => `- [[${title}]]`).join("\n");
  if (existingBody.includes("## Sources")) {
    return existingBody.replace(
      /## Sources\n\n/,
      `## Sources\n\n${addition}\n`,
    );
  }
  return `${existingBody.trimEnd()}\n\n## Sources\n\n${addition}\n`;
}

/** How many source notes on one theme before we draft a synthesis (pilot). */
export const SYNTHESIS_SOURCE_THRESHOLD = 2;
