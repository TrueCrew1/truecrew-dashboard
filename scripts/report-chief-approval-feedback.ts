#!/usr/bin/env node
/**
 * Read-only report: Chief approval feedback (approved / sent_back / rejected)
 * for the documented Approval Feedback Review workflow
 * (docs/AGENT_RUNBOOK.md § "Approval Feedback Review", Agent Workflows).
 *
 * Reads chief_approval_decisions via the existing
 * fetchChiefApprovalDecisions() helper (lib/supabase/queries.ts) — the same
 * helper that workflow's step 1 already names. No writes, no new Supabase
 * config path, no new env vars, no AI calls, stdout only.
 *
 * Usage:
 *   npm run chief:approval-feedback
 *   npm run chief:approval-feedback -- --days 60
 *   npm run chief:approval-feedback -- --recent 20
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSupabaseConfigured } from "../lib/supabase/admin.js";
import {
  fetchChiefApprovalDecisions,
  type DbChiefApprovalDecisionRow,
} from "../lib/supabase/queries.js";

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_RECENT_LIMIT = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface ReportOptions {
  days: number;
  recentLimit: number;
}

function usage(): string {
  return `Chief approval feedback report — read-only, no writes, stdout only.

Usage:
  npm run chief:approval-feedback
  npm run chief:approval-feedback -- --days 60
  npm run chief:approval-feedback -- --recent 20

Options:
  --days N     Look back N days (default: ${DEFAULT_WINDOW_DAYS})
  --recent N   Show at most N recent rejected/sent_back entries (default: ${DEFAULT_RECENT_LIMIT})
  -h, --help   Show this help

Reads chief_approval_decisions via lib/supabase/queries.ts's
fetchChiefApprovalDecisions() — the same helper docs/AGENT_RUNBOOK.md's
"Approval Feedback Review" workflow names for its step 1. Requires
SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (same config as the rest of the
app) — no mock/local fallback, this reports on live data only.
`;
}

function parsePositiveInt(raw: string | undefined, flag: string): number {
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new Error(`${flag} requires a positive whole number, got "${raw ?? ""}".`);
  }
  return value;
}

function parseArgs(argv: string[]): ReportOptions {
  let days = DEFAULT_WINDOW_DAYS;
  let recentLimit = DEFAULT_RECENT_LIMIT;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--days") {
      days = parsePositiveInt(argv[++i], "--days");
    } else if (arg === "--recent") {
      recentLimit = parsePositiveInt(argv[++i], "--recent");
    } else {
      throw new Error(`Unknown argument "${arg}". Run with --help for usage.`);
    }
  }

  return { days, recentLimit };
}

function isWithinWindow(row: DbChiefApprovalDecisionRow, cutoff: Date): boolean {
  const decidedAt = new Date(row.decided_at);
  return !Number.isNaN(decidedAt.getTime()) && decidedAt >= cutoff;
}

function printReport(rows: DbChiefApprovalDecisionRow[], options: ReportOptions): void {
  const title = `Chief Approval Feedback (last ${options.days} days)`;
  console.log(title);
  console.log("-".repeat(title.length));

  if (rows.length === 0) {
    console.log("No recent decisions found.");
    return;
  }

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  console.log(`Total: ${rows.length}`);
  console.log(`Approved: ${counts.approved ?? 0}`);
  console.log(`Sent back: ${counts.sent_back ?? 0}`);
  console.log(`Rejected: ${counts.rejected ?? 0}`);
  console.log("");

  const flagged = rows.filter(
    (row) => row.status === "rejected" || row.status === "sent_back",
  );

  if (flagged.length === 0) {
    console.log("Recent rejected / sent_back: none in this window.");
    return;
  }

  const shown = flagged.slice(0, options.recentLimit);
  console.log(
    `Recent rejected / sent_back (showing ${shown.length} of ${flagged.length}):`,
  );
  for (const row of shown) {
    console.log(`- proposal_id: ${row.proposal_id}`);
    console.log(`  status: ${row.status}`);
    console.log(`  decided_at: ${row.decided_at}`);
    console.log(`  actor: ${row.actor ?? "unknown"}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(usage());
    return;
  }

  const options = parseArgs(argv);

  if (!isSupabaseConfigured()) {
    console.error(
      "Chief approval feedback report: Supabase is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    );
    console.error(
      "This report reads live data only — there is no mock/local fallback. Set both env vars and retry.",
    );
    process.exit(1);
  }

  const cutoff = new Date(Date.now() - options.days * MS_PER_DAY);
  const allDecisions = await fetchChiefApprovalDecisions();
  const windowed = allDecisions.filter((row) => isWithinWindow(row, cutoff));

  printReport(windowed, options);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
