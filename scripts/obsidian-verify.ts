#!/usr/bin/env node
import fs from "node:fs";
import { getVaultPath, isVaultConfigured } from "../lib/obsidian/config";
import { loadLocalEnv } from "../lib/obsidian/load-env";
import {
  logBuild,
  logDecision,
  logPr,
  updateHotContext,
} from "../lib/obsidian/log";
import {
  decisionNotePath,
  HOT_CONTEXT_PATH,
  ROLLING_LOG_PATHS,
} from "../lib/obsidian/paths";

loadLocalEnv();

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message: string): void {
  console.log(`✓ ${message}`);
}

async function main(): Promise<void> {
  console.log("True Crew — Obsidian logging verification");
  console.log("=========================================\n");

  if (!isVaultConfigured()) {
    fail(
      "OBSIDIAN_VAULT_PATH is not set.\n\n" +
        "Create .env.local in the repo root:\n" +
        "  OBSIDIAN_VAULT_PATH=/absolute/path/to/your/obsidian-vault\n\n" +
        "See docs/OBSIDIAN_LOGGING_QUICKSTART.md",
    );
  }

  const vaultPath = getVaultPath()!;
  if (!fs.existsSync(vaultPath)) {
    fail(`Vault folder does not exist:\n  ${vaultPath}`);
  }
  if (!fs.statSync(vaultPath).isDirectory()) {
    fail(`OBSIDIAN_VAULT_PATH must be a folder, not a file:\n  ${vaultPath}`);
  }

  ok(`Vault path: ${vaultPath}\n`);

  const stamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  const decisionPath = decisionNotePath("VERIFY first decision entry");

  const steps = [
    {
      label: "build log",
      run: () =>
        logBuild({
          result: "success",
          branch: "main",
          commit: "verify000",
          notes: `VERIFY run at ${stamp}`,
        }),
      expected: ROLLING_LOG_PATHS.build,
    },
    {
      label: "decision log",
      run: () =>
        logDecision({
          title: "VERIFY first decision entry",
          context: "First-time Obsidian logging verification.",
          decision: "Use npm run obsidian:verify to confirm the vault path works.",
        }),
      expected: decisionPath,
    },
    {
      label: "PR log",
      run: () =>
        logPr({
          number: 0,
          title: "VERIFY first PR log entry",
          status: "updated",
          notes: `VERIFY run at ${stamp}`,
        }),
      expected: ROLLING_LOG_PATHS.pr,
    },
    {
      label: "hot context",
      run: () =>
        updateHotContext({
          body: [
            `VERIFY run at ${stamp}`,
            "",
            "- Focus: confirm Obsidian logging works end to end",
            "- Blocker: none",
            "- Next: use npm run obsidian:log for real entries",
          ].join("\n"),
        }),
      expected: HOT_CONTEXT_PATH,
    },
  ] as const;

  const written: string[] = [];

  for (const step of steps) {
    const result = await step.run();
    if (result.obsidianPath !== step.expected) {
      fail(`${step.label}: expected ${step.expected}, got ${result.obsidianPath}`);
    }
    ok(`${step.label} → ${result.obsidianPath}`);
    written.push(result.obsidianPath);
  }

  console.log("\nVerification complete. Open Obsidian and check:\n");
  for (const notePath of written) {
    console.log(`  • ${notePath}`);
  }
  console.log(
    "\nNotes marked VERIFY are safe to edit or delete after you confirm the flow.",
  );
  console.log("Daily logging: docs/OBSIDIAN_LOGGING_QUICKSTART.md");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
