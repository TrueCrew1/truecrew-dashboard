/**
 * Canonical Google Drive paths for the TrueCrew Mac setup.
 * Google Drive is the only source of truth for files + the Obsidian vault.
 */

export const DEFAULT_WORKSPACE_PATH = "/Users/truecrew/Google Drive/TrueCrew";

export const DEFAULT_VAULT_PATH =
  "/Users/truecrew/Google Drive/TrueCrew/Obsidian Vaults/TrueCrew Second Brain";

/** Vault folders seeded for the second-brain layout. */
export const VAULT_LAYOUT_FOLDERS = [
  "Sources",
  "Topics",
  "Synthesis",
  "Questions",
  "Ops",
  "Operations/Logs",
] as const;
