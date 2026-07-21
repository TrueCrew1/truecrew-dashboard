#!/usr/bin/env node
/**
 * Seed Obsidian vault with True Crew workflow templates.
 * Skips files that already exist — safe to re-run.
 *
 * Ops to run (first time only, if vault not yet configured):
 *   npm run obsidian:setup-vault -- --vault-path "/path/to/vault"
 */
import fsSync from "node:fs";
import path from "node:path";
import {
  DEFAULT_VAULT_PATH,
  describeVaultResolution,
  isVaultConfigured,
} from "../lib/obsidian/config";
import { seedVaultTemplates } from "../lib/obsidian/seed";

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fsSync.existsSync(envPath)) return;

  const content = fsSync.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env) || !process.env[key]?.trim()) {
      process.env[key] = value;
    }
  }
}

function parseVaultPathArg(args: string[]): string | null {
  const flagIndex = args.indexOf("--vault-path");
  if (flagIndex !== -1 && args[flagIndex + 1]) {
    return args[flagIndex + 1];
  }

  return null;
}

function usage(): string {
  return `True Crew → Obsidian vault setup

Usage:
  npm run obsidian:setup-vault
  npm run obsidian:setup-vault -- --force
  npm run obsidian:setup-vault -- --vault-path "${DEFAULT_VAULT_PATH}"

Options:
  --force                 Overwrite existing template files
  --vault-path <path>     Vault root (alternative to OBSIDIAN_VAULT_PATH)

Environment:
  OBSIDIAN_VAULT_PATH     Absolute path to your local Obsidian vault root
  .env.local              Loaded automatically when present
`;
}

async function main(): Promise<void> {
  loadEnvLocal();

  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  const vaultPathArg = parseVaultPathArg(args);
  if (vaultPathArg) {
    process.env.OBSIDIAN_VAULT_PATH = vaultPathArg;
  }

  if (!isVaultConfigured()) {
    console.error(describeVaultResolution());
    process.exit(1);
  }

  const force = args.includes("--force");
  const { vaultPath, templatesDir, written, skipped } = await seedVaultTemplates({ force });

  if (written.length === 0 && skipped.length === 0) {
    console.error(`No .md templates found in ${templatesDir}`);
    process.exit(1);
  }

  console.log(`Vault: ${vaultPath}`);
  console.log(`Templates source: ${templatesDir}`);
  if (written.length) {
    console.log("\nWrote:");
    for (const file of written) console.log(`  + ${file}`);
  }
  if (skipped.length) {
    console.log("\nSkipped (already exist; use --force to overwrite):");
    for (const file of skipped) console.log(`  · ${file}`);
  }
  if (!written.length && !skipped.length) {
    console.log("Nothing to do.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
