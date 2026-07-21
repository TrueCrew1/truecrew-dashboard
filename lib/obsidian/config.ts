import fs from "node:fs";
import path from "node:path";

const VAULT_ENV = "OBSIDIAN_VAULT_PATH";

/**
 * Primary Obsidian vault — True Crew Second Brain (Knowledge Architecture V1).
 * See docs/FILE_SECOND_BRAIN_KNOWLEDGE_ARCHITECTURE_V1.md for the full spec.
 * Used only when the directory exists on disk.
 */
export const DEFAULT_VAULT_PATH = "/Users/truecrew/ObsidianVault";

/**
 * Legacy vault path — deprecated. Superseded by DEFAULT_VAULT_PATH above per the
 * True Crew Second Brain — Knowledge Architecture V1 decision. Not read by any
 * code path; kept only as a historical reference for anyone still Sync-ing here.
 */
// const LEGACY_ICLOUD_VAULT_PATH =
//   "/Users/truecrew/Library/Mobile Documents/iCloud~md~obsidian/Documents/TRUE CREW-SECOND BRAIN";

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
      `${VAULT_ENV} is not set or vault directory does not exist. Point it at your local Obsidian vault root.`,
    );
  }
  return vaultPath;
}

export function describeVaultResolution(): string {
  const envRaw = process.env[VAULT_ENV]?.trim();
  const lines = ["No readable Obsidian vault found.", ""];

  if (envRaw) {
    lines.push(`  ${VAULT_ENV} is set but not found on disk:`);
    lines.push(`    ${envRaw}`, "");
  } else {
    lines.push(`  ${VAULT_ENV} is not set.`);
    lines.push(`  Default vault path also not found:`);
    lines.push(`    ${DEFAULT_VAULT_PATH}`, "");
  }

  lines.push("Run once (same line — path has spaces, keep quotes):");
  lines.push(
    `  OBSIDIAN_VAULT_PATH="${DEFAULT_VAULT_PATH}" npm run obsidian:setup-vault`,
  );
  lines.push("");
  lines.push("Or pass the path as a flag:");
  lines.push(
    `  npm run obsidian:setup-vault -- --vault-path "${DEFAULT_VAULT_PATH}"`,
  );

  return lines.join("\n");
}
