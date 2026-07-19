#!/usr/bin/env node
/**
 * Triage TrueCrew/00-Inbox-Downloads — classify, move, log, create Obsidian notes.
 *
 *   npm run workspace:triage -- --dry-run
 *   npm run workspace:triage
 */
import fs from "node:fs";
import path from "node:path";
import {
  WORKSPACE_ENV,
  describeWorkspaceResolution,
  isWorkspaceConfigured,
  runTriage,
} from "../lib/workspace/index";

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

function parseArgs(argv: string[]): {
  dryRun: boolean;
  skipObsidian: boolean;
  limit?: number;
} {
  const dryRun = argv.includes("--dry-run");
  const skipObsidian = argv.includes("--skip-obsidian");
  let limit: number | undefined;
  const limitIndex = argv.indexOf("--limit");
  if (limitIndex !== -1) {
    const raw = argv[limitIndex + 1];
    const parsed = Number(raw);
    if (!raw || Number.isNaN(parsed) || parsed < 1) {
      throw new Error("--limit requires a positive number");
    }
    limit = parsed;
  }
  return { dryRun, skipObsidian, limit };
}

function usage(): string {
  return `True Crew → inbox triage

Usage:
  npm run workspace:triage -- --dry-run
  npm run workspace:triage
  npm run workspace:triage -- --limit 10

What it does:
  1. Scans TrueCrew/00-Inbox-Downloads (Google Drive)
  2. Classifies each file (review / research / second-brain / archive / delete-candidates)
  3. Moves the file into the matching folder
  4. Appends a log row (Obsidian Triage Log + Triage-Log.csv)
  5. Creates Obsidian Sources/ notes for research-worthy files
  6. Upserts Topics/ and draft Synthesis/ when themes repeat

--dry-run prints the plan only (no moves, no note changes).

Bots never permanently delete. Junk goes to 05-Delete-Candidates for you.

Environment:
  ${WORKSPACE_ENV}     Path to TrueCrew workspace root
  OBSIDIAN_VAULT_PATH    Path to TrueCrew Second Brain vault (inside Drive)
`;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  if (!isWorkspaceConfigured()) {
    console.error(describeWorkspaceResolution());
    process.exit(1);
  }

  const options = parseArgs(args);
  const result = await runTriage(options);

  console.log(options.dryRun ? "Dry run (no moves / no note changes)" : "Triage complete");
  console.log(`  Scanned:   ${result.scanned}`);
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Moved:     ${result.moved}`);
  console.log(`  Skipped:   ${result.skipped}`);

  if (result.entries.length) {
    console.log("\nEntries:");
    for (const entry of result.entries) {
      console.log(
        `  · ${entry.filename} → ${entry.toFolder} [${entry.bucket}/${entry.confidence}] — ${entry.reason}`,
      );
    }
  } else {
    console.log("\nInbox empty — nothing to triage.");
  }

  if (result.topicNotesCreated.length) {
    console.log("\nTopic notes:");
    for (const note of result.topicNotesCreated) console.log(`  + ${note}`);
  }
  if (result.synthesisNotesCreated.length) {
    console.log("\nSynthesis drafts:");
    for (const note of result.synthesisNotesCreated) console.log(`  + ${note}`);
  }

  console.log("\nLogs:");
  console.log(
    `  Sheet CSV: ${result.sheetPath ?? "(not written — dry run or missing workspace)"}`,
  );
  console.log(
    `  Obsidian:  ${result.logPath ?? "(skipped — vault not configured, --skip-obsidian, or dry run)"}`,
  );
  console.log("\nDelete control: review 05-Delete-Candidates yourself. Bots will not empty it.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
