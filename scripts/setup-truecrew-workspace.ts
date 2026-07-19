#!/usr/bin/env node
/**
 * Create the TrueCrew intake folder tree (local / Google Drive mirror).
 *
 *   npm run workspace:setup
 *   npm run workspace:setup -- --path "/path/to/TrueCrew"
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_WORKSPACE_PATH,
  WORKSPACE_ENV,
  resolveWorkspacePathForSetup,
} from "../lib/workspace/config";
import { setupWorkspace } from "../lib/workspace/setup";

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
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

function parsePathArg(args: string[]): string | undefined {
  const flagIndex = args.findIndex((arg) => arg === "--path" || arg === "--workspace-path");
  if (flagIndex !== -1 && args[flagIndex + 1]) return args[flagIndex + 1];
  return undefined;
}

function usage(): string {
  return `True Crew → workspace folder setup

Usage:
  npm run workspace:setup
  npm run workspace:setup -- --path "${DEFAULT_WORKSPACE_PATH}"

Creates:
  TrueCrew/00-Inbox-Downloads
  TrueCrew/01-Needs-Review
  TrueCrew/02-Research-Queue
  TrueCrew/03-Second-Brain
  TrueCrew/04-Archive
  TrueCrew/05-Delete-Candidates
  TrueCrew/BOT_PERMISSIONS.md
  TrueCrew/GOOGLE_DRIVE.md
  TrueCrew/03-Second-Brain/Triage-Log.csv

Environment:
  ${WORKSPACE_ENV}   Absolute path to the TrueCrew workspace root
`;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  const explicit = parsePathArg(args);
  const root = resolveWorkspacePathForSetup(explicit);
  process.env[WORKSPACE_ENV] = root;

  const result = await setupWorkspace(root);

  console.log(`Workspace: ${result.root}`);
  console.log("\nFolders:");
  for (const folder of result.createdFolders) console.log(`  + ${folder}/`);
  if (result.createdFiles.length) {
    console.log("\nFiles:");
    for (const file of result.createdFiles) console.log(`  + ${file}`);
  }
  console.log("\nNext:");
  console.log(`  1. Add to .env.local: ${WORKSPACE_ENV}="${result.root}"`);
  console.log("  2. Drop files into 00-Inbox-Downloads");
  console.log("  3. Preview: npm run workspace:triage -- --dry-run");
  console.log("  4. Run:     npm run workspace:triage");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
