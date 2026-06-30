import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_VAULT_PATH, VAULT_ENV } from "./config.shared";

export type VaultAccess =
  | { kind: "ready"; path: string }
  | { kind: "missing"; error: string }
  | { kind: "invalid"; path: string; error: string };

function envVaultPath(): string | null {
  const raw = process.env[VAULT_ENV]?.trim();
  return raw ? path.resolve(raw) : null;
}

/**
 * Resolve whether the Obsidian vault can be read for API requests.
 * Distinguishes missing configuration from invalid/unreadable paths.
 */
export async function resolveVaultAccess(): Promise<VaultAccess> {
  const fromEnv = envVaultPath();
  const candidate = fromEnv ?? path.resolve(DEFAULT_VAULT_PATH);

  try {
    const stats = await fs.stat(candidate);

    if (!stats.isDirectory()) {
      return {
        kind: "invalid",
        path: candidate,
        error: "Vault path is not a directory",
      };
    }

    return { kind: "ready", path: candidate };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT" || code === "ENOTDIR") {
      if (fromEnv) {
        return {
          kind: "missing",
          error: `${VAULT_ENV} is set but the vault directory was not found`,
        };
      }

      return {
        kind: "missing",
        error: `${VAULT_ENV} is not configured and the default vault path was not found`,
      };
    }

    if (code === "EACCES" || code === "EPERM") {
      return {
        kind: "invalid",
        path: candidate,
        error: "Vault path is not readable",
      };
    }

    throw error;
  }
}

export function isVaultConfigured(access: VaultAccess): boolean {
  return access.kind !== "missing";
}
