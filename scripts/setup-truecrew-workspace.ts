#!/usr/bin/env node
/**
 * Create the TrueCrew intake folder tree in Google Drive + path entries in .env.local.
 *
 *   npm run workspace:setup
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_WORKSPACE_PATH,
  resolveWorkspacePathForSetup,
} from "../lib/workspace/config";
import { upsertPathEnvLocal } from "../lib/workspace/env-local";
import { DEFAULT_VAULT_PATH } from "../lib/workspace/paths";
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
  return `True Crew → Google Drive workspace setup

Usage:
  npm run workspace:setup

Creates under Google Drive:
  TrueCrew/00-Inbox-Downloads … 05-Delete-Candidates
  TrueCrew/BOT_PERMISSIONS.md
  TrueCrew/03-Second-Brain/Triage-Log.csv
  TrueCrew/Obsidian Vaults/TrueCrew Second Brain/{Sources,Topics,Synthesis,Questions,Ops,Operations/Logs}

Also upserts ONLY these keys in .env.local (secrets left alone):
  TRUECREW_WORKSPACE_PATH
  OBSIDIAN_VAULT_PATH
`;
}

const WORKSPACE_PREVIEW = [
  "00-Inbox-Downloads/",
  "01-Needs-Review/",
  "02-Research-Queue/",
  "03-Second-Brain/",
  "04-Archive/",
  "05-Delete-Candidates/",
  "Obsidian Vaults/TrueCrew Second Brain/",
];

async function main(): Promise<void> {
  loadEnvLocal();
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  const explicit = parsePathArg(args);
  const root = resolveWorkspacePathForSetup(explicit);
  const vaultPath = path.join(root, "Obsidian Vaults", "TrueCrew Second Brain");

  const envResult = upsertPathEnvLocal(process.cwd(), {
    workspacePath: root,
    vaultPath: root === DEFAULT_WORKSPACE_PATH ? DEFAULT_VAULT_PATH : vaultPath,
  });

  const result = await setupWorkspace(root);

  console.log(`Workspace: ${result.root}`);
  console.log(`Vault:     ${result.vaultPath}`);
  console.log(
    envResult.created
      ? `\n.env.local: created (path keys only)`
      : `\n.env.local: updated path keys only (secrets untouched)`,
  );
  console.log(`  keys: ${envResult.updatedKeys.join(", ")}`);

  console.log("\nFolders ready:");
  for (const folder of WORKSPACE_PREVIEW) console.log(`  + ${folder}`);

  console.log("\nNext (copy/paste, one line at a time):");
  console.log("  npm run obsidian:setup-vault");
  console.log("  npm run workspace:triage -- --dry-run");
  console.log("  npm run workspace:triage");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
