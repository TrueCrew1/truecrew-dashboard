import fs from "node:fs";
import path from "node:path";
import { DEFAULT_VAULT_PATH as DRIVE_VAULT_PATH } from "../workspace/paths.js";

const VAULT_ENV = "OBSIDIAN_VAULT_PATH";

/**
 * Default Obsidian vault — lives inside Google Drive (source of truth).
 * Override with OBSIDIAN_VAULT_PATH in .env.local.
 */
export const DEFAULT_VAULT_PATH = DRIVE_VAULT_PATH;

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
      `${VAULT_ENV} is not set or vault directory does not exist. ` +
        `Run: npm run obsidian:setup-vault`,
    );
  }
  return vaultPath;
}

/** Resolve a vault path for setup even when the folder does not exist yet. */
export function resolveVaultPathForSetup(explicitPath?: string): string {
  const raw = explicitPath?.trim() || process.env[VAULT_ENV]?.trim();
  if (raw) return path.resolve(raw);
  return path.resolve(DEFAULT_VAULT_PATH);
}

export function describeVaultResolution(): string {
  const envRaw = process.env[VAULT_ENV]?.trim();
  const lines = ["No readable Obsidian vault found.", ""];

  if (envRaw) {
    lines.push(`  ${VAULT_ENV} is set but not found on disk:`);
    lines.push(`    ${envRaw}`, "");
  } else {
    lines.push(`  ${VAULT_ENV} is not set.`);
    lines.push(`  Default Google Drive vault path also not found:`);
    lines.push(`    ${DEFAULT_VAULT_PATH}`, "");
  }

  lines.push("Create the vault once:");
  lines.push(`  npm run obsidian:setup-vault`);
  lines.push("");
  lines.push("Or pass the path as a flag:");
  lines.push(
    `  npm run obsidian:setup-vault -- --vault-path "${DEFAULT_VAULT_PATH}"`,
  );

  return lines.join("\n");
}

export { VAULT_ENV };
