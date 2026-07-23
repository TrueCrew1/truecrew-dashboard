/**
 * Pure filters for Chief project-scoped Obsidian / GitHub reads.
 * Keeps path matching out of UI components so tests can cover scope rules.
 */
export function notePathMatchesProjectPrefix(obsidianPath: string, prefix: string): boolean {
  const path = obsidianPath.replace(/\\/g, "/");
  const normalized = prefix.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized) return false;
  return path === normalized || path.startsWith(`${normalized}/`);
}

export function filterNotesByObsidianPrefixes<T extends { obsidianPath: string }>(
  notes: readonly T[],
  prefixes: readonly string[],
): T[] {
  if (prefixes.length === 0) return [];
  return notes.filter((note) =>
    prefixes.some((prefix) => notePathMatchesProjectPrefix(note.obsidianPath, prefix)),
  );
}
