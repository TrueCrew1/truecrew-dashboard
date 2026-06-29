import fs from "node:fs/promises";
import path from "node:path";
import { getVaultPath } from "./config";

export type VaultNoteType =
  | "build"
  | "deploy"
  | "incident"
  | "ticket"
  | "decision"
  | "onboarding";

export interface VaultNote {
  title: string;
  type: VaultNoteType;
  obsidianPath: string;
  summary?: string;
  syncedAt?: string;
}

const SKIP_DIRS = new Set([".obsidian", ".trash", ".git", "node_modules"]);

function inferNoteType(relativePath: string): VaultNoteType {
  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized.startsWith("Decisions/")) return "decision";
  if (normalized.includes("/Deploys/") || normalized.startsWith("Operations/Deploys/")) {
    return "deploy";
  }
  if (normalized.startsWith("Customers/")) return "onboarding";
  if (normalized.includes("/Runbooks/") || normalized.startsWith("Operations/Runbooks/")) {
    return "build";
  }
  if (normalized.includes("/Logs/") || normalized.startsWith("Operations/Logs/")) {
    return "build";
  }
  if (normalized.toLowerCase().includes("incident")) return "incident";

  return "ticket";
}

function titleFromPath(relativePath: string): string {
  const base = path.basename(relativePath, path.extname(relativePath));
  return base.replace(/\.md$/i, "");
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).trimStart();
}

function extractSummary(content: string): string | undefined {
  const body = stripFrontmatter(content);
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/^#+\s*/, "").trim())
    .filter(Boolean);

  const first = paragraphs[0];
  if (!first) return undefined;

  const singleLine = first.replace(/\s+/g, " ");
  return singleLine.length > 200 ? `${singleLine.slice(0, 197)}...` : singleLine;
}

async function walkMarkdownFiles(
  directory: string,
  vaultRoot: string,
  results: VaultNote[],
): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkMarkdownFiles(absolutePath, vaultRoot, results);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const relativePath = path.relative(vaultRoot, absolutePath).replace(/\\/g, "/");
    const stat = await fs.stat(absolutePath);
    const content = await fs.readFile(absolutePath, "utf8");

    results.push({
      title: titleFromPath(relativePath),
      type: inferNoteType(relativePath),
      obsidianPath: relativePath,
      summary: extractSummary(content),
      syncedAt: stat.mtime.toISOString(),
    });
  }
}

export async function listVaultNotes(): Promise<VaultNote[]> {
  const vaultPath = getVaultPath();
  if (!vaultPath) return [];

  const notes: VaultNote[] = [];
  await walkMarkdownFiles(vaultPath, vaultPath, notes);

  return notes.sort((a, b) => {
    const aTime = a.syncedAt ?? "";
    const bTime = b.syncedAt ?? "";
    return bTime.localeCompare(aTime);
  });
}
