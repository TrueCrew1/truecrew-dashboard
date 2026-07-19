import fs from "node:fs/promises";
import path from "node:path";
import { assertMoveAllowed } from "./permissions.js";
import type { TriageDestination } from "./folders.js";

export interface MoveResult {
  destinationPath: string;
  renamed: boolean;
  finalFilename: string;
}

/**
 * Move a file into an approved triage folder.
 * Never crosses outside workspaceRoot. Collision → "name (2).ext" style rename.
 */
export async function moveWithinWorkspace(
  workspaceRoot: string,
  sourcePath: string,
  destinationFolder: TriageDestination,
  dryRun = false,
): Promise<MoveResult> {
  assertMoveAllowed(destinationFolder);

  const resolvedRoot = path.resolve(workspaceRoot);
  const resolvedSource = path.resolve(sourcePath);
  if (!resolvedSource.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Refusing to move file outside workspace: ${sourcePath}`);
  }

  const destDir = path.join(resolvedRoot, destinationFolder);
  const originalName = path.basename(resolvedSource);
  const { absolutePath, filename, renamed } = await resolveCollisionFreePath(
    destDir,
    originalName,
    dryRun,
  );

  if (!absolutePath.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Refusing destination outside workspace: ${absolutePath}`);
  }

  if (!dryRun) {
    await fs.mkdir(destDir, { recursive: true });
    await fs.rename(resolvedSource, absolutePath);
  }

  return {
    destinationPath: absolutePath,
    renamed,
    finalFilename: filename,
  };
}

async function resolveCollisionFreePath(
  destDir: string,
  filename: string,
  dryRun: boolean,
): Promise<{ absolutePath: string; filename: string; renamed: boolean }> {
  let candidate = path.join(destDir, filename);
  if (dryRun || !(await exists(candidate))) {
    return { absolutePath: candidate, filename, renamed: false };
  }

  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  let index = 2;

  while (index < 1000) {
    const nextName = `${stem} (${index})${ext}`;
    candidate = path.join(destDir, nextName);
    if (!(await exists(candidate))) {
      return { absolutePath: candidate, filename: nextName, renamed: true };
    }
    index += 1;
  }

  throw new Error(`Could not find a free name for ${filename} in ${destDir}`);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
