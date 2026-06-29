import fs from "node:fs";
import path from "node:path";

const VAULT_ENV = "OBSIDIAN_VAULT_PATH";

/** Local iCloud vault — used only when the directory exists on disk. */
export const DEFAULT_VAULT_PATH =
  "/Users/truecrew/Library/Mobile Documents/iCloud~md~obsidian/Documents/TRUE CREW-SECOND BRAIN";

function resolveExistingVaultPath(candidate: string): string | null {
  const resolved = path.resolve(candidate);
  try {
    return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

export function getVaultPath(): string | null {
  const raw = process.env[VAULT_ENV]?.trim();
  if (raw) return resolveExistingVaultPath(raw);

  return resolveExistingVaultPath(DEFAULT_VAULT_PATH);
}

export function isVaultConfigured(): boolean {
  return getVaultPath() !== null;
}

export function requireVaultPath(): string {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    throw new Error(
      `${VAULT_ENV} is not set. Point it at your local Obsidian vault root.`,
    );
  }
  return vaultPath;
}
