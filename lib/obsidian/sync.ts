import fs from "node:fs/promises";
import path from "node:path";
import { isVaultConfigured, requireVaultPath } from "./config.js";
import { logBuild } from "./log.js";
import { seedVaultTemplates } from "./seed.js";
import type { BuildLogEntry, ObsidianWriteResult } from "./types.js";

/** Default location for the last-run dedupe signature — repo-local, gitignored (see .gitignore's `.qa` entry). */
const DEFAULT_STATE_DIR = ".qa";
const STATE_FILE_NAME = "second-brain-sync-last-run.json";

export interface SecondBrainSyncOptions {
  result?: BuildLogEntry["result"];
  branch?: string;
  commit?: string;
  notes?: string;
  /** Overwrite existing vault templates instead of skipping them. Default false. */
  force?: boolean;
  /**
   * Where the last-run dedupe signature is cached. Defaults to the repo's
   * local `.qa/` scratch dir — override only for tests/tooling that must not
   * touch that real state (e.g. a temp dir in unit tests).
   */
  stateDir?: string;
}

interface SecondBrainSyncBase {
  /** Discriminant — narrow on this instead of guessing from field presence. */
  status: "not-configured" | "deduped" | "synced";
  vaultConfigured: boolean;
  vaultPath: string | null;
  /** Vault notes actually written this run (seeded templates + a build log append, if any). */
  notesUpdated: number;
  /** Vault-relative paths of templates that didn't exist before this run. */
  newSectionsCreated: string[];
  buildLogEntry: ObsidianWriteResult | null;
  /** Why nothing (or nothing further) was written — set whenever buildLogEntry is null. */
  skippedReason?: string;
}

/** OBSIDIAN_VAULT_PATH isn't reachable (unset, or not a real directory) — most CI/deployed environments. */
export interface SecondBrainSyncNotConfigured extends SecondBrainSyncBase {
  status: "not-configured";
  vaultConfigured: false;
  vaultPath: null;
  notesUpdated: 0;
  newSectionsCreated: [];
  buildLogEntry: null;
  skippedReason: string;
}

/** Vault reachable, but this run repeats the immediately-previous (branch, commit, result, notes) signature — no new information, so the build log append was skipped to keep it high-signal. Templates still seed normally. */
export interface SecondBrainSyncDeduped extends SecondBrainSyncBase {
  status: "deduped";
  vaultConfigured: true;
  vaultPath: string;
  buildLogEntry: null;
  skippedReason: string;
}

/** Vault reachable and this run wrote a fresh build log entry (first run, or something changed since the last one). */
export interface SecondBrainSyncSynced extends SecondBrainSyncBase {
  status: "synced";
  vaultConfigured: true;
  vaultPath: string;
  buildLogEntry: ObsidianWriteResult;
  skippedReason?: undefined;
}

export type SecondBrainSyncSummary =
  | SecondBrainSyncNotConfigured
  | SecondBrainSyncDeduped
  | SecondBrainSyncSynced;

function computeSignature(vaultPath: string, options: SecondBrainSyncOptions): string {
  return [
    vaultPath,
    options.result ?? "unknown",
    options.branch ?? "",
    options.commit ?? "",
    options.notes ?? "",
  ].join("|");
}

async function readLastSignature(stateDir: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(stateDir, STATE_FILE_NAME), "utf8");
    const parsed = JSON.parse(raw) as { signature?: unknown };
    return typeof parsed.signature === "string" ? parsed.signature : null;
  } catch {
    // Missing, unreadable, or corrupt state — treat as "no previous run" rather than fail the sync.
    return null;
  }
}

async function writeLastSignature(stateDir: string, signature: string): Promise<void> {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(path.join(stateDir, STATE_FILE_NAME), JSON.stringify({ signature }), "utf8");
}

/**
 * Second Brain Sync: seeds any missing vault workflow templates, then appends a
 * build-log entry summarizing this run — unless this run is a duplicate of the
 * last one (see the "deduped" status). Pure function — no shell/child_process —
 * so Research or Chief code can call it in-process with no extra shell privileges.
 * Never throws on an unreachable vault; check `summary.status`/`vaultConfigured`
 * instead, since most environments (CI, deployed Vercel functions) can't reach a
 * local vault at all.
 */
export async function runSecondBrainSync(
  options: SecondBrainSyncOptions = {},
): Promise<SecondBrainSyncSummary> {
  if (!isVaultConfigured()) {
    return {
      status: "not-configured",
      vaultConfigured: false,
      vaultPath: null,
      notesUpdated: 0,
      newSectionsCreated: [],
      buildLogEntry: null,
      skippedReason: "OBSIDIAN_VAULT_PATH is not set or the vault directory does not exist",
    };
  }

  const vaultPath = requireVaultPath();
  const stateDir = options.stateDir ?? DEFAULT_STATE_DIR;
  const seedResult = await seedVaultTemplates({ force: options.force });

  const signature = computeSignature(vaultPath, options);
  const lastSignature = await readLastSignature(stateDir);

  if (lastSignature === signature) {
    return {
      status: "deduped",
      vaultConfigured: true,
      vaultPath,
      notesUpdated: seedResult.written.length,
      newSectionsCreated: seedResult.written,
      buildLogEntry: null,
      skippedReason:
        "Duplicate of the last synced run (same result/branch/commit/notes) — build log append skipped to keep it high-signal",
    };
  }

  const buildLogEntry = await logBuild({
    result: options.result ?? "unknown",
    branch: options.branch,
    commit: options.commit,
    notes: options.notes ?? "Second Brain Sync",
  });
  await writeLastSignature(stateDir, signature);

  return {
    status: "synced",
    vaultConfigured: true,
    vaultPath,
    notesUpdated: seedResult.written.length + 1,
    newSectionsCreated: seedResult.written,
    buildLogEntry,
  };
}
