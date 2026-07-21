import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireVaultPath } from "./config.js";
import { writeVaultNote } from "./write.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const VAULT_TEMPLATES_DIR = path.resolve(__dirname, "../../docs/vault-templates");

export interface SeedVaultTemplatesResult {
  vaultPath: string;
  templatesDir: string;
  written: string[];
  skipped: string[];
}

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

/** Seeds vault workflow templates from docs/vault-templates. Skips existing files unless force. Safe to re-run. */
export async function seedVaultTemplates(
  options: { force?: boolean } = {},
): Promise<SeedVaultTemplatesResult> {
  const vaultPath = requireVaultPath();
  const templates = await collectTemplateFiles(VAULT_TEMPLATES_DIR);

  const written: string[] = [];
  const skipped: string[] = [];

  for (const relative of templates) {
    const vaultRelative = relative.replace(/\\/g, "/");
    const vaultAbsolute = path.resolve(vaultPath, vaultRelative);
    const templateAbsolute = path.join(VAULT_TEMPLATES_DIR, relative);

    if (!options.force) {
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

  return { vaultPath, templatesDir: VAULT_TEMPLATES_DIR, written, skipped };
}
