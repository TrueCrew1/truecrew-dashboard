import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const NOTE_TYPES = [
  "build",
  "deploy",
  "incident",
  "ticket",
  "decision",
  "onboarding",
] as const;

export type ObsidianNoteType = (typeof NOTE_TYPES)[number];

export interface ObsidianNoteSummary {
  title: string;
  type: ObsidianNoteType;
  obsidianPath: string;
  summary: string;
  syncedAt: string;
}

export interface ObsidianNoteDetail extends ObsidianNoteSummary {
  content: string;
  frontmatter: Record<string, unknown>;
}

const SKIP_DIRS = new Set([".obsidian"]);

function isHiddenEntry(name: string): boolean {
  return name.startsWith(".");
}

function isNoteType(value: unknown): value is ObsidianNoteType {
  return typeof value === "string" && NOTE_TYPES.includes(value as ObsidianNoteType);
}

function inferNoteType(relativePath: string, frontmatter: Record<string, unknown>): ObsidianNoteType {
  if (isNoteType(frontmatter.type)) {
    return frontmatter.type;
  }

  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();

  if (normalized.includes("/deploys/") || normalized.startsWith("operations/deploys/")) {
    return "deploy";
  }
  if (normalized.includes("/decisions/") || normalized.startsWith("decisions/")) {
    return "decision";
  }
  if (normalized.includes("onboarding")) {
    return "onboarding";
  }
  if (normalized.includes("build log") || normalized.includes("/logs/build")) {
    return "build";
  }
  if (normalized.includes("/incidents/") || normalized.includes("incident")) {
    return "incident";
  }
  if (normalized.includes("/tickets/") || normalized.includes("ticket")) {
    return "ticket";
  }

  return "decision";
}

function titleFromPath(relativePath: string): string {
  const fileName = path.basename(relativePath, ".md");
  return fileName || relativePath;
}

function summaryFromBody(body: string, frontmatter: Record<string, unknown>): string {
  if (typeof frontmatter.summary === "string" && frontmatter.summary.trim()) {
    return frontmatter.summary.trim();
  }

  const firstLine = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return "";
  return firstLine.length > 240 ? `${firstLine.slice(0, 237)}...` : firstLine;
}

function parseNoteFile(
  relativePath: string,
  rawContent: string,
  syncedAt: string,
): ObsidianNoteSummary {
  const parsed = matter(rawContent);
  const frontmatter = parsed.data as Record<string, unknown>;
  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : titleFromPath(relativePath);

  return {
    title,
    type: inferNoteType(relativePath, frontmatter),
    obsidianPath: relativePath.replace(/\\/g, "/"),
    summary: summaryFromBody(parsed.content, frontmatter),
    syncedAt,
  };
}

export function resolveVaultReadPath(vaultPath: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolutePath = path.resolve(vaultPath, normalized);
  const vaultRoot = path.resolve(vaultPath);

  if (
    absolutePath !== vaultRoot &&
    !absolutePath.startsWith(vaultRoot + path.sep)
  ) {
    throw new Error(`Refusing to read outside vault: ${relativePath}`);
  }

  if (!absolutePath.endsWith(".md")) {
    throw new Error("Only .md notes can be read");
  }

  return absolutePath;
}

async function walkMarkdownFiles(
  directory: string,
  vaultRoot: string,
  results: string[],
): Promise<void> {
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      throw new Error("Vault path is missing or unreadable");
    }
    throw error;
  }

  for (const entry of entries) {
    if (isHiddenEntry(entry.name) || SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await walkMarkdownFiles(absolutePath, vaultRoot, results);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(path.relative(vaultRoot, absolutePath).replace(/\\/g, "/"));
    }
  }
}

export async function listVaultNotes(vaultPath: string): Promise<ObsidianNoteSummary[]> {
  const vaultRoot = path.resolve(vaultPath);
  const relativePaths: string[] = [];

  await walkMarkdownFiles(vaultRoot, vaultRoot, relativePaths);

  const notes = await Promise.all(
    relativePaths.map(async (relativePath) => {
      const absolutePath = path.join(vaultRoot, relativePath);
      const [rawContent, stats] = await Promise.all([
        fs.readFile(absolutePath, "utf8"),
        fs.stat(absolutePath),
      ]);

      return parseNoteFile(relativePath, rawContent, stats.mtime.toISOString());
    }),
  );

  notes.sort((a, b) => a.obsidianPath.localeCompare(b.obsidianPath));
  return notes;
}

export async function readVaultNote(
  vaultPath: string,
  relativePath: string,
): Promise<ObsidianNoteDetail | null> {
  const absolutePath = resolveVaultReadPath(vaultPath, relativePath);

  let rawContent: string;
  let stats;

  try {
    [rawContent, stats] = await Promise.all([
      fs.readFile(absolutePath, "utf8"),
      fs.stat(absolutePath),
    ]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const parsed = matter(rawContent);
  const frontmatter = parsed.data as Record<string, unknown>;
  const summary = parseNoteFile(relativePath, rawContent, stats.mtime.toISOString());

  return {
    ...summary,
    content: parsed.content.trim(),
    frontmatter,
  };
}

export async function assertVaultReadable(vaultPath: string): Promise<void> {
  try {
    const stats = await fs.stat(vaultPath);
    if (!stats.isDirectory()) {
      throw new Error("Vault path is not a directory");
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR" || code === "EACCES") {
      throw new Error("Vault path is missing or unreadable");
    }
    throw error;
  }
}
