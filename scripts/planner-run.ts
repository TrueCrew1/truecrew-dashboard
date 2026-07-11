#!/usr/bin/env node
import { processNextPlannerWorkItem } from "../lib/planner/pipeline.js";
import { isVaultConfigured } from "../lib/obsidian/index.js";
import { isSupabaseConfigured } from "../lib/supabase/admin.js";

function usage(): string {
  return `True Crew — Planner / Obsidian Agent local runner

Processes one queued planner work item (Tier 0 filing pass).

Usage:
  npm run planner:run

Environment:
  OBSIDIAN_VAULT_PATH       Absolute path to your local Obsidian vault
  SUPABASE_URL              Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY Service role key for runtime tables
`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage());
    return;
  }

  if (!isSupabaseConfigured()) {
    console.error("Supabase is not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }

  if (!isVaultConfigured()) {
    console.error("OBSIDIAN_VAULT_PATH is not set.");
    console.error(usage());
    process.exit(1);
  }

  const result = await processNextPlannerWorkItem();
  if (!result) {
    console.log("No queued planner work items.");
    return;
  }

  console.log("Planner work item completed.");
  console.log(`  work_item_id: ${result.workItemId}`);
  console.log(`  execution_job_id: ${result.executionJobId}`);
  console.log(`  obsidian_path: ${result.obsidianPath}`);
  console.log(`  notes_index_id: ${result.noteId}`);
  console.log(`  task_id: ${result.taskId ?? "(not approved — skipped)"}`);
}

main().catch((error) => {
  console.error("Planner run failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
