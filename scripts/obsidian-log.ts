#!/usr/bin/env node
import fs from "node:fs/promises";
import {
  isVaultConfigured,
  loadLocalEnv,
  logBuild,
  logDecision,
  logPr,
  updateHotContext,
} from "../lib/obsidian/index";

loadLocalEnv();

type Command = "build" | "decision" | "pr" | "hot-context";

function usage(): string {
  return `True Crew → Obsidian logging (local-first)

Usage:
  npm run obsidian:log -- build --result <success|failure|cancelled|unknown> [--branch <name>] [--commit <sha>] [--notes <text>]
  npm run obsidian:log -- decision --title <text> --decision <text> [--context <text>] [--consequences <text>]
  npm run obsidian:log -- pr --number <n> --title <text> --status <opened|merged|closed|updated> [--url <url>] [--notes <text>]
  npm run obsidian:log -- hot-context --body <text>
  npm run obsidian:log -- hot-context --file <path>

Environment:
  OBSIDIAN_VAULT_PATH  Absolute path to your local Obsidian vault root
`;
}

function parseArgs(argv: string[]): { command: Command; flags: Map<string, string> } {
  const [command, ...rest] = argv;
  if (!command || !["build", "decision", "pr", "hot-context"].includes(command)) {
    throw new Error(`Unknown or missing command: ${command ?? "(none)"}`);
  }

  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    flags.set(key, next);
    i += 1;
  }

  return { command: command as Command, flags };
}

function requireFlag(flags: Map<string, string>, key: string): string {
  const value = flags.get(key)?.trim();
  if (!value) throw new Error(`--${key} is required`);
  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  if (!isVaultConfigured()) {
    console.error("OBSIDIAN_VAULT_PATH is not set.");
    console.error(usage());
    process.exit(1);
  }

  const { command, flags } = parseArgs(args);

  let result;
  switch (command) {
    case "build":
      result = await logBuild({
        result: requireFlag(flags, "result") as "success" | "failure" | "cancelled" | "unknown",
        branch: flags.get("branch"),
        commit: flags.get("commit"),
        notes: flags.get("notes"),
      });
      break;
    case "decision":
      result = await logDecision({
        title: requireFlag(flags, "title"),
        context: flags.get("context"),
        decision: requireFlag(flags, "decision"),
        consequences: flags.get("consequences"),
      });
      break;
    case "pr":
      result = await logPr({
        number: Number(requireFlag(flags, "number")),
        title: requireFlag(flags, "title"),
        status: requireFlag(flags, "status") as "opened" | "merged" | "closed" | "updated",
        url: flags.get("url"),
        notes: flags.get("notes"),
      });
      break;
    case "hot-context": {
      const body = flags.get("body");
      const file = flags.get("file");
      if (!body && !file) throw new Error("hot-context requires --body or --file");
      const content = body ?? (await fs.readFile(file!, "utf8"));
      result = await updateHotContext({ body: content });
      break;
    }
  }

  console.log(`Wrote ${result.obsidianPath}`);
  console.log(result.absolutePath);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
