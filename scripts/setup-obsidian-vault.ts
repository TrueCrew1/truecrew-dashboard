#!/usr/bin/env node
/**
 * Seed Obsidian vault with True Crew workflow templates.
 * Skips files that already exist — safe to re-run.
 *
 * Ops to run (first time only, if vault not yet configured):
 *   echo 'OBSIDIAN_VAULT_PATH=/absolute/path/to/vault' >> .env.local
 *   npm run obsidian:setup-vault
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isVaultConfigured, requireVaultPath } from "../lib/obsidian/config";
import { writeVaultNote } from "../lib/obsidian/write";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../docs/vault-templates");

async function collectTemplateFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTemplateFiles(absolute, base)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.relative(base, absolute));
    }
  }

  return files.sort();
}

function usage(): string {
  return `True Crew → Obsidian vault setup

Usage:
  npm run obsidian:setup-vault              Seed vault from docs/vault-templates/ (skip existing)
  npm run obsidian:setup-vault -- --force     Overwrite existing template files

Environment:
  OBSIDIAN_VAULT_PATH  Absolute path to your local Obsidian vault root
`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  if (!isVaultConfigured()) {
    console.error("OBSIDIAN_VAULT_PATH is not set.");
    console.error(usage());
    process.exit(1);
  }

  const force = args.includes("--force");
  const vaultPath = requireVaultPath();
  const templates = await collectTemplateFiles(TEMPLATES_DIR);

  if (templates.length === 0) {
    console.error(`No .md templates found in ${TEMPLATES_DIR}`);
    process.exit(1);
  }

  const written: string[] = [];
  const skipped: string[] = [];

  for (const relative of templates) {
    const vaultRelative = relative.replace(/\\/g, "/");
    const vaultAbsolute = path.resolve(vaultPath, vaultRelative);
    const templateAbsolute = path.join(TEMPLATES_DIR, relative);

    if (!force) {
      try {
        await fs.access(vaultAbsolute);
        skipped.push(vaultRelative);
        continue;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }

    const content = await fs.readFile(templateAbsolute, "utf8");
    await writeVaultNote(vaultRelative, content);
    written.push(vaultRelative);
  }

  console.log(`Vault: ${vaultPath}`);
  console.log(`Templates source: ${TEMPLATES_DIR}`);
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
