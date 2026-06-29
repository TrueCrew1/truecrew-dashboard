import path from "node:path";

const VAULT_ENV = "OBSIDIAN_VAULT_PATH";

export function getVaultPath(): string | null {
  const raw = process.env[VAULT_ENV]?.trim();
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
