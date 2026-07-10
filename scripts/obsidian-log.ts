#!/usr/bin/env node
import fs from "node:fs/promises";
import { createTaskArtifact } from "../lib/librarian/create.js";
import {
  isVaultConfigured,
  logBuild,
  logDecision,
  logPr,
  updateHotContext,
} from "../lib/obsidian/index";
import {
  previewResearchFinding,
  type ResearchFindingPayload,
} from "../lib/research/researchFinding";
import { writeFindingToKnowledge } from "../lib/research/writeFinding";

type Command = "build" | "decision" | "pr" | "hot-context" | "artifact";

function usage(): string {
  return `True Crew → Obsidian logging (local-first)

Usage:
  npm run obsidian:log -- build --result <success|failure|cancelled|unknown> [--branch <name>] [--commit <sha>] [--notes <text>]
  npm run obsidian:log -- decision --title <text> --decision <text> [--context <text>] [--consequences <text>]
  npm run obsidian:log -- pr --number <n> --title <text> --status <opened|merged|closed|updated> [--url <url>] [--notes <text>]
  npm run obsidian:log -- hot-context --body <text>
  npm run obsidian:log -- hot-context --file <path>
  npm run obsidian:log -- artifact --task-id <id> [--use-ai]
  npm run obsidian:log -- research-finding --file <path>            (dry run: validates + prints destination, writes nothing)
  npm run obsidian:log -- research-finding --file <path> --write    (real local write to knowledge/, tier-limited)

Environment:
  OBSIDIAN_VAULT_PATH  Absolute path to your local Obsidian vault root
  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  Required for artifact indexing
  LIBRARIAN_AI_ENABLED  Optional; set true with Ollama for AI refinement
`;
}

function parseArgs(argv: string[]): { command: Command; flags: Map<string, string> } {
  const [command, ...rest] = argv;
  if (!command || !["build", "decision", "pr", "hot-context", "artifact"].includes(command)) {
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

/**
 * Filing scaffold entry point: read a prepared Research Finding payload,
 * validate it, and either preview (default) or perform the real local write
 * (`--write`). Dry run remains the default — nothing is written unless
 * `--write` is passed explicitly. Neither mode requires OBSIDIAN_VAULT_PATH:
 * this writes only to the repo's own `knowledge/` tree, never the vault.
 */
async function runResearchFinding(rest: string[]): Promise<void> {
  const fileIndex = rest.indexOf("--file");
  const filePath = fileIndex >= 0 ? rest[fileIndex + 1] : undefined;
  if (!filePath || filePath.startsWith("--")) {
    throw new Error("research-finding requires --file <path> to a JSON payload");
  }
  const write = rest.includes("--write");

  const raw = await fs.readFile(filePath, "utf8");
  let payload: ResearchFindingPayload;
  try {
    payload = JSON.parse(raw) as ResearchFindingPayload;
  } catch {
    throw new Error(`Could not parse JSON payload at ${filePath}`);
  }

  const preview = previewResearchFinding(payload);
  if (!preview.ok || !preview.destination) {
    console.error("Research Finding payload is invalid:");
    for (const error of preview.errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  if (!write) {
    console.log("Research Finding — dry run (no files written)");
    console.log(`  tier:      ${preview.destination.tier}`);
    console.log(`  path:      ${preview.destination.path}`);
    console.log(`  file name: ${preview.destination.fileName}`);
    console.log(`  mode:      ${preview.destination.mode}`);
    if (preview.logLine) console.log(`  log line:  ${preview.logLine}`);
    console.log("Re-run with --write to perform this write for real.");
    return;
  }

  const result = await writeFindingToKnowledge(payload, preview.destination);
  console.log(
    result.mode === "append" ? "Research Finding — appended" : "Research Finding — written",
  );
  console.log(`  tier: ${preview.destination.tier}`);
  console.log(`  path: ${result.path}`);
  console.log(`  absolute: ${result.absolutePath}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  if (args[0] === "research-finding") {
    await runResearchFinding(args.slice(1));
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
    case "artifact": {
      const created = await createTaskArtifact({
        taskId: requireFlag(flags, "task-id"),
        useAi: flags.get("use-ai") === "true",
        actor: "operator",
      });
      console.log(`Indexed artifact ${created.artifact.id}`);
      console.log(`Work item: ${created.workItem.id} (${created.workItem.status})`);
      console.log(`Vault written: ${created.vaultWritten}`);
      console.log(`Path: ${created.artifact.targetPath}`);
      return;
    }
  }

  console.log(`Wrote ${result.obsidianPath}`);
  console.log(result.absolutePath);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
