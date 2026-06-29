import fs from "node:fs";
import path from "node:path";

const VAULT_ENV = "OBSIDIAN_VAULT_PATH";

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/** Load OBSIDIAN_VAULT_PATH from repo-root `.env.local` when not already set. */
export function loadLocalEnv(cwd = process.cwd()): void {
  if (process.env[VAULT_ENV]?.trim()) return;

  const envPath = path.resolve(cwd, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (key !== VAULT_ENV) continue;

    const value = unquote(trimmed.slice(separator + 1).trim());
    if (value) process.env[VAULT_ENV] = value;
    return;
  }
}
