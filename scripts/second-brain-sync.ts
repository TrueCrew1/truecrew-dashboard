#!/usr/bin/env node
/**
 * Second Brain Sync — seeds any missing Obsidian vault templates, then logs a
 * build entry summarizing the run. Thin CLI wrapper around
 * lib/obsidian/sync.ts#runSecondBrainSync, the same function Research/Chief
 * code can call in-process.
 *
 * Ops to run (nightly QA, manual, or a future Research/Chief lane call):
 *   npm run second-brain:sync -- --result success --branch main --commit abc1234 --notes "nightly qa"
 */
import { runSecondBrainSync } from "../lib/obsidian/sync";

function usage(): string {
  return `True Crew → Second Brain Sync

Usage:
  npm run second-brain:sync
  npm run second-brain:sync -- --result <success|failure|cancelled|unknown> [--branch <name>] [--commit <sha>] [--notes <text>] [--force]

Environment:
  OBSIDIAN_VAULT_PATH  Absolute path to your local Obsidian vault root

If the vault isn't configured, this exits 0 and reports skippedReason instead
of failing — most environments (CI, deployed functions) can't reach a local
vault, and that shouldn't break the caller.
`;
}

function parseArgs(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags.set(key, "true");
      continue;
    }
    flags.set(key, next);
    i += 1;
  }
  return flags;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  const flags = parseArgs(args);
  const result = flags.get("result") as
    | "success"
    | "failure"
    | "cancelled"
    | "unknown"
    | undefined;

  const summary = await runSecondBrainSync({
    result,
    branch: flags.get("branch"),
    commit: flags.get("commit"),
    notes: flags.get("notes"),
    force: flags.get("force") === "true",
  });

  if (summary.status === "not-configured") {
    console.log(`Second Brain Sync skipped: ${summary.skippedReason}`);
    return;
  }

  console.log(`Vault: ${summary.vaultPath}`);
  console.log(`Notes updated: ${summary.notesUpdated}`);
  if (summary.newSectionsCreated.length) {
    console.log("New sections created:");
    for (const file of summary.newSectionsCreated) console.log(`  + ${file}`);
  }

  if (summary.status === "deduped") {
    console.log(`Build log: skipped — ${summary.skippedReason}`);
    return;
  }

  console.log(`Build log: ${summary.buildLogEntry.obsidianPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
