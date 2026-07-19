import fs from "node:fs";
import path from "node:path";
import { DEFAULT_VAULT_PATH, DEFAULT_WORKSPACE_PATH } from "./paths.js";

const PATH_KEYS = ["TRUECREW_WORKSPACE_PATH", "OBSIDIAN_VAULT_PATH"] as const;

export type PathEnvKey = (typeof PATH_KEYS)[number];

/**
 * Upsert ONLY the two folder-path keys into .env.local.
 * Never prints or logs other env values (secrets stay untouched and unread in output).
 */
export function upsertPathEnvLocal(
  repoRoot = process.cwd(),
  paths: {
    workspacePath?: string;
    vaultPath?: string;
  } = {},
): { envPath: string; updatedKeys: PathEnvKey[]; created: boolean } {
  const envPath = path.join(repoRoot, ".env.local");
  const workspacePath = paths.workspacePath ?? DEFAULT_WORKSPACE_PATH;
  const vaultPath = paths.vaultPath ?? DEFAULT_VAULT_PATH;

  const desired: Record<PathEnvKey, string> = {
    TRUECREW_WORKSPACE_PATH: workspacePath,
    OBSIDIAN_VAULT_PATH: vaultPath,
  };

  let created = false;
  let existing = "";
  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf8");
  } else {
    created = true;
  }

  const lines = existing.length ? existing.split(/\r?\n/) : [];
  const seen = new Set<PathEnvKey>();
  const nextLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      nextLines.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      nextLines.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim() as PathEnvKey;
    if ((PATH_KEYS as readonly string[]).includes(key)) {
      nextLines.push(`${key}=${JSON.stringify(desired[key])}`);
      seen.add(key);
      continue;
    }
    // Leave every other key (including secrets) exactly as-is.
    nextLines.push(line);
  }

  const updatedKeys: PathEnvKey[] = [];
  for (const key of PATH_KEYS) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${JSON.stringify(desired[key])}`);
      updatedKeys.push(key);
    } else {
      updatedKeys.push(key);
    }
  }

  // Ensure trailing newline
  const body = `${nextLines.filter((line, index, arr) => {
    // Drop extra trailing empties, then re-add one newline via join
    if (line !== "" || index < arr.length - 1) return true;
    return false;
  }).join("\n")}\n`;

  fs.writeFileSync(envPath, body, "utf8");

  // Reflect into process.env for the rest of this run (no secret values involved).
  process.env.TRUECREW_WORKSPACE_PATH = workspacePath;
  process.env.OBSIDIAN_VAULT_PATH = vaultPath;

  return { envPath, updatedKeys, created };
}
