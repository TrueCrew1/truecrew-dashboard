#!/usr/bin/env node
/**
 * Research runner CLI — picks up operator-released (in_progress) queue rows.
 *
 * Contract (docs/RESEARCH_RUNNER.md):
 *   Approve Start-research card → queued becomes in_progress (dashboard/API).
 *   This runner picks the oldest in_progress row, reports it, and (for Claude
 *   cloud agents) leaves investigation + PATCH done/blocked to the agent session.
 *
 * Env:
 *   TRUECREW_API_URL       Deployed app origin (no trailing slash required)
 *   TRUECREW_INTERNAL_KEY  Same value as INTERNAL_API_SECRET / x-internal-key
 *
 * Usage:
 *   npm run research:runner -- status
 *   npm run research:runner -- pickup
 *   npm run research:runner -- run
 *   npm run research:runner -- block --id <id> --note "<why>"
 *   npm run research:runner -- done --id <id> --path <filedPath>
 */
import "dotenv/config";
import {
  countByStatus,
  listResearchRequestsViaApi,
  mutateReleasedRequestViaApi,
  pickOldestInProgress,
  resolveResearchRunnerEnv,
  type RunnerResearchRequest,
} from "../lib/research/runnerClient.js";

type Command = "status" | "pickup" | "run" | "block" | "done";

function usage(): string {
  return `True Crew research runner

Usage:
  npm run research:runner -- status
  npm run research:runner -- pickup
  npm run research:runner -- run
  npm run research:runner -- block --id <requestId> --note <text>
  npm run research:runner -- done --id <requestId> --path <filedPath>

Environment (required for live queue sync):
  TRUECREW_API_URL        e.g. https://truecrew-dashboard.vercel.app
  TRUECREW_INTERNAL_KEY   must match server INTERNAL_API_SECRET

Approval (Chief → Approvals) moves queued → in_progress.
This runner only picks in_progress rows — it never auto-approves.
`;
}

function parseArgs(argv: string[]): { command: Command; flags: Map<string, string> } {
  const [command, ...rest] = argv;
  if (!command || !["status", "pickup", "run", "block", "done"].includes(command)) {
    throw new Error(`Unknown or missing command: ${command ?? "(none)"}\n\n${usage()}`);
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

function printRequest(row: RunnerResearchRequest): void {
  console.log(`  ${row.id}`);
  console.log(`    status:  ${row.status}`);
  console.log(`    topic:   ${row.topic}`);
  console.log(`    source:  ${row.source}`);
  console.log(`    updated: ${row.updatedAt}`);
  if (row.filedPath) console.log(`    filed:   ${row.filedPath}`);
  if (row.blockerNote) console.log(`    blocker: ${row.blockerNote}`);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const resolved = resolveResearchRunnerEnv();
  if (!resolved.ok) {
    console.error(`[research-runner] degraded: ${resolved.error}`);
    console.error("[research-runner] Repo-native fallback: fill knowledge/findings scaffolds and PATCH later.");
    process.exitCode = 1;
    return;
  }

  const { env } = resolved;

  if (command === "status" || command === "pickup" || command === "run") {
    let requests: RunnerResearchRequest[];
    try {
      requests = await listResearchRequestsViaApi(env);
    } catch (error) {
      console.error(
        "[research-runner] live_list_failed:",
        error instanceof Error ? error.message : error,
      );
      console.error(
        "[research-runner] Check TRUECREW_* env, INTERNAL_API_SECRET match, and that `research_requests` is migrated (`npm run db:push`).",
      );
      process.exitCode = 1;
      return;
    }

    const counts = countByStatus(requests);
    console.log(
      `[research-runner] queue: ${requests.length} rows ` +
        `(queued=${counts.queued}, in_progress=${counts.in_progress}, done=${counts.done}, blocked=${counts.blocked})`,
    );

    if (command === "status") {
      for (const row of requests) printRequest(row);
      return;
    }

    const pickup = pickOldestInProgress(requests);
    if (!pickup) {
      console.log(
        "[research-runner] No in_progress requests. Approve a Start-research card in Chief → Approvals first.",
      );
      process.exitCode = 2;
      return;
    }

    console.log("[research-runner] Pickup (oldest in_progress):");
    printRequest(pickup);
    console.log(
      "[research-runner] Investigate this topic, file provisional findings, then:\n" +
        `  npm run research:runner -- done --id ${pickup.id} --path <filedPath>\n` +
        "  or block with --note when blocked.",
    );
    return;
  }

  const id = flags.get("id")?.trim();
  if (!id) throw new Error("--id is required");

  if (command === "block") {
    const note = flags.get("note")?.trim();
    if (!note) throw new Error("--note is required for block");
    const row = await mutateReleasedRequestViaApi(env, id, "block", { blockerNote: note });
    console.log("[research-runner] Marked blocked:");
    printRequest(row);
    return;
  }

  if (command === "done") {
    const path = flags.get("path")?.trim();
    if (!path) throw new Error("--path is required for done");
    const row = await mutateReleasedRequestViaApi(env, id, "done", { filedPath: path });
    console.log("[research-runner] Marked done:");
    printRequest(row);
  }
}

main().catch((error) => {
  console.error("[research-runner] fatal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
