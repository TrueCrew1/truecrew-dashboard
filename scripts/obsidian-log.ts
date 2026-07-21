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
import { DECISION_CONTROLLED_TAGS, type DecisionControlledTag } from "../lib/obsidian/types";

type Command = "build" | "decision" | "pr" | "hot-context" | "artifact";

function usage(): string {
  return `True Crew → Obsidian logging (local-first)

Usage:
  npm run obsidian:log -- build --result <success|failure|cancelled|unknown> [--branch <name>] [--commit <sha>] [--notes <text>]
  npm run obsidian:log -- decision --title <text> --decision <text> --summary <text>
    [--context <text>] [--alternatives <text>] [--impact <text>] [--follow-ups <text>]
    [--status active|deprecated] [--tags <comma-separated, controlled vocab only>]
    [--related <comma-separated note titles, max 3>]
  npm run obsidian:log -- pr --number <n> --title <text> --status <opened|merged|closed|updated> [--url <url>] [--notes <text>]
  npm run obsidian:log -- hot-context --body <text>
  npm run obsidian:log -- hot-context --file <path>
  npm run obsidian:log -- artifact --task-id <id> [--use-ai]

Decision tag vocabulary (controlled — invalid tags are rejected):
  ${DECISION_CONTROLLED_TAGS.join(", ")}

Decisions are written to True Crew/05-Decisions/YYYY-MM-DD - <slug>.md in the vault
(Knowledge Architecture V1 — see docs/FILE_SECOND_BRAIN_KNOWLEDGE_ARCHITECTURE_V1.md).

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

function parseCommaList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDecisionTags(value: string | undefined): DecisionControlledTag[] {
  const requested = parseCommaList(value);
  const invalid = requested.filter(
    (tag) => !DECISION_CONTROLLED_TAGS.includes(tag as DecisionControlledTag),
  );
  if (invalid.length > 0) {
    throw new Error(
      `Invalid tag(s): ${invalid.join(", ")}. Controlled vocabulary is: ${DECISION_CONTROLLED_TAGS.join(", ")}. ` +
        `Adding a new tag is a human decision recorded on the Second Brain hub — agents never invent tags.`,
    );
  }
  return requested as DecisionControlledTag[];
}

function parseDecisionStatus(value: string | undefined): "active" | "deprecated" | undefined {
  if (!value) return undefined;
  if (value !== "active" && value !== "deprecated") {
    throw new Error(`--status must be "active" or "deprecated" (got "${value}")`);
  }
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
    case "decision": {
      const related = parseCommaList(flags.get("related")).slice(0, 3);
      result = await logDecision({
        title: requireFlag(flags, "title"),
        summary: requireFlag(flags, "summary"),
        context: flags.get("context"),
        decision: requireFlag(flags, "decision"),
        alternatives: flags.get("alternatives"),
        impact: flags.get("impact"),
        followUps: flags.get("follow-ups"),
        status: parseDecisionStatus(flags.get("status")),
        tags: parseDecisionTags(flags.get("tags")),
        related,
      });
      break;
    }
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
