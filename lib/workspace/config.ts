import fs from "node:fs";
import path from "node:path";
import { WORKSPACE_ROOT_NAME } from "./folders.js";

const WORKSPACE_ENV = "TRUECREW_WORKSPACE_PATH";

/**
 * Default local path on a Mac with Google Drive for Desktop.
 * Override with TRUECREW_WORKSPACE_PATH in .env.local.
 */
export const DEFAULT_WORKSPACE_PATH = path.join(
  "/Users/truecrew/Library/CloudStorage/GoogleDrive-truecrew",
  "My Drive",
  WORKSPACE_ROOT_NAME,
);

function resolveExistingDir(candidate: string): string | null {
  const resolved = path.resolve(candidate);
  try {
    return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? resolved : null;
  } catch {
    return null;
  }
}

export function getWorkspacePath(): string | null {
  const raw = process.env[WORKSPACE_ENV]?.trim();
  if (raw) return resolveExistingDir(raw);
  return resolveExistingDir(DEFAULT_WORKSPACE_PATH);
}

export function isWorkspaceConfigured(): boolean {
  return getWorkspacePath() !== null;
}

export function requireWorkspacePath(): string {
  const workspacePath = getWorkspacePath();
  if (!workspacePath) {
    throw new Error(
      `${WORKSPACE_ENV} is not set or the TrueCrew folder does not exist. ` +
        `Run: npm run workspace:setup`,
    );
  }
  return workspacePath;
}

/** Resolve a path for setup even when the folder does not exist yet. */
export function resolveWorkspacePathForSetup(explicitPath?: string): string {
  const raw = explicitPath?.trim() || process.env[WORKSPACE_ENV]?.trim();
  if (raw) return path.resolve(raw);
  return path.resolve(DEFAULT_WORKSPACE_PATH);
}

export function describeWorkspaceResolution(): string {
  const envRaw = process.env[WORKSPACE_ENV]?.trim();
  const lines = ["No readable TrueCrew workspace found.", ""];

  if (envRaw) {
    lines.push(`  ${WORKSPACE_ENV} is set but not found on disk:`);
    lines.push(`    ${envRaw}`, "");
  } else {
    lines.push(`  ${WORKSPACE_ENV} is not set.`);
    lines.push(`  Default Google Drive path also not found:`);
    lines.push(`    ${DEFAULT_WORKSPACE_PATH}`, "");
  }

  lines.push("Create the folder tree:");
  lines.push(`  npm run workspace:setup`);
  lines.push("");
  lines.push("Or point at an existing folder:");
  lines.push(
    `  ${WORKSPACE_ENV}="/path/to/TrueCrew" npm run workspace:setup`,
  );

  return lines.join("\n");
}

export { WORKSPACE_ENV };
