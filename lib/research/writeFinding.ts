/**
 * Research Finding → Filing: real local write path (Option C, write step).
 *
 * The counterpart to lib/research/researchFinding.ts's pure dry-run preview.
 * This module is the only place in the scaffold that touches the filesystem.
 * It writes exclusively inside this repo's git-tracked `knowledge/` tree —
 * never the live Obsidian vault (lib/obsidian/write.ts, a different root
 * entirely, gated on OBSIDIAN_VAULT_PATH) and never Supabase.
 *
 * Limited strictly to the three tier destinations
 * resolveFindingDestination() already defines:
 *   - log                    -> append to knowledge/log.md
 *   - lesson                 -> create knowledge/lessons/<slug>.md
 *   - starter-pass-candidate -> create knowledge/inbox/<slug>.md
 * Any other destination path is refused outright, not just discouraged.
 *
 * Safety guards, deliberately minimal:
 *   - refuses to write outside knowledge/ (path-escape guard)
 *   - refuses to write outside the specific tier prefix for the given mode
 *   - refuses to overwrite an existing file on create/flag mode (no dedupe
 *     beyond this — same file-exists check, nothing smarter)
 * No indexing, no Supabase, no new permissions.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  formatFindingNote,
  formatLogLine,
  type FindingDestination,
  type ResearchFindingPayload,
} from "./researchFinding";

export interface WriteResult {
  /** Repo-relative path written (matches destination.path). */
  path: string;
  absolutePath: string;
  mode: FindingDestination["mode"];
  /** true for a brand-new file (create/flag), false for an append. */
  created: boolean;
}

/**
 * Resolve a `knowledge/`-relative path against `repoRoot`, refusing anything
 * that would land outside the `knowledge/` directory. Mirrors the same
 * escape guard `lib/obsidian/write.ts`'s `resolveVaultFile` uses, applied to
 * the repo's `knowledge/` tree instead of the live vault.
 */
export function resolveKnowledgePath(relativePath: string, repoRoot: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized.startsWith("knowledge/")) {
    throw new Error(`Refusing to write outside knowledge/: ${relativePath}`);
  }

  const knowledgeRoot = path.resolve(repoRoot, "knowledge");
  const absolutePath = path.resolve(repoRoot, normalized);
  if (!absolutePath.startsWith(knowledgeRoot + path.sep)) {
    throw new Error(`Refusing to write outside knowledge/: ${relativePath}`);
  }

  return absolutePath;
}

async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Perform the real local write for an already-validated finding and its
 * resolved destination. Callers must pass a `destination` produced by
 * `resolveFindingDestination` (or an equally-shaped, already-validated
 * object) — this function re-checks the path against the exact tier
 * prefixes rather than trusting the caller, so a bad destination is refused
 * here too, not just upstream.
 */
export async function writeFindingToKnowledge(
  payload: ResearchFindingPayload,
  destination: FindingDestination,
  repoRoot: string = process.cwd(),
): Promise<WriteResult> {
  const absolutePath = resolveKnowledgePath(destination.path, repoRoot);

  if (destination.mode === "append") {
    if (destination.path !== "knowledge/log.md") {
      throw new Error(`Refusing append write outside knowledge/log.md: ${destination.path}`);
    }
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.appendFile(absolutePath, `${formatLogLine(payload)}\n`, "utf8");
    return { path: destination.path, absolutePath, mode: destination.mode, created: false };
  }

  const allowedPrefix =
    destination.mode === "create" ? "knowledge/lessons/" : "knowledge/inbox/";
  if (!destination.path.startsWith(allowedPrefix)) {
    throw new Error(
      `Refusing ${destination.mode} write outside ${allowedPrefix}: ${destination.path}`,
    );
  }

  if (await fileExists(absolutePath)) {
    throw new Error(
      `Refusing to overwrite existing file: ${destination.path} (already exists — ` +
        `pick a different title, or remove/update it directly if this is intentional)`,
    );
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, formatFindingNote(payload), "utf8");
  return { path: destination.path, absolutePath, mode: destination.mode, created: true };
}
