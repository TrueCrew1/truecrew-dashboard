/**
 * Gated Obsidian write for Chief project note drafts.
 * Call only after an explicit operator approval — never from draft generation.
 */
import { writeVaultNote } from "./write.js";

export class ObsidianScopeWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObsidianScopeWriteError";
  }
}

function pathInPrefix(relativePath: string, prefix: string): boolean {
  const path = relativePath.replace(/\\/g, "/");
  const normalized = prefix.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized) return false;
  return path === normalized || path.startsWith(`${normalized}/`);
}

/**
 * Write a vault note only when `relativePath` sits under one of
 * `allowedPrefixes`. Used after Chief approval — not for speculative drafts.
 */
export async function writeScopedProjectNote(input: {
  relativePath: string;
  content: string;
  allowedPrefixes: readonly string[];
}): Promise<string> {
  const relativePath = input.relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!relativePath.endsWith(".md")) {
    throw new ObsidianScopeWriteError("Project note path must end in .md");
  }
  if (
    !input.allowedPrefixes.some((prefix) => pathInPrefix(relativePath, prefix))
  ) {
    throw new ObsidianScopeWriteError(
      `Refusing to write outside project Obsidian scope: ${relativePath}`,
    );
  }
  return writeVaultNote(relativePath, input.content);
}
