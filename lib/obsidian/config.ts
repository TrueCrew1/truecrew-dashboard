import path from "node:path";

const VAULT_ENV = "OBSIDIAN_VAULT_PATH";

export const DEFAULT_VAULT_PATH =
  "/Users/truecrew/Library/Mobile Documents/iCloud~md~obsidian/Documents/TRUE CREW-SECOND BRAIN";

export function getVaultPath(): string | null {
  const raw = process.env[VAULT_ENV]?.trim() || DEFAULT_VAULT_PATH;
  if (!raw) return null;
  return path.resolve(raw);
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
