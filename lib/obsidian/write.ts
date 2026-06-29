import fs from "node:fs/promises";
import path from "node:path";
import { requireVaultPath } from "./config";

export function resolveVaultFile(relativePath: string): string {
  const vaultPath = requireVaultPath();
  const normalized = relativePath.replace(/\\/g, "/");
  const absolutePath = path.resolve(vaultPath, normalized);

  if (!absolutePath.startsWith(vaultPath + path.sep) && absolutePath !== vaultPath) {
    throw new Error(`Refusing to write outside vault: ${relativePath}`);
  }

  return absolutePath;
}

async function ensureParentDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function appendVaultNote(
  relativePath: string,
  content: string,
  seed = "",
): Promise<string> {
  const absolutePath = resolveVaultFile(relativePath);
  await ensureParentDir(absolutePath);

  try {
    await fs.access(absolutePath);
    await fs.appendFile(absolutePath, content, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await fs.writeFile(absolutePath, seed + content, "utf8");
  }

  return absolutePath;
}

export async function writeVaultNote(relativePath: string, content: string): Promise<string> {
  const absolutePath = resolveVaultFile(relativePath);
  await ensureParentDir(absolutePath);
  await fs.writeFile(absolutePath, content, "utf8");
  return absolutePath;
}
