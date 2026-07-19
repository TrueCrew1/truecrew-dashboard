import fs from "node:fs/promises";
import path from "node:path";
import { appendVaultNote } from "../obsidian/write.js";
import { isVaultConfigured } from "../obsidian/config.js";
import type { TriageLogEntry } from "./types.js";

/** Obsidian rolling log inside the TrueCrew Second Brain vault. */
export const TRIAGE_LOG_VAULT_PATH = "Operations/Logs/Triage Log.md";

/** CSV inside the TrueCrew workspace — importable to Google Sheets. */
export const TRIAGE_SHEET_RELATIVE_PATH = "03-Second-Brain/Triage-Log.csv";

function formatTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function renderTriageLogSection(entry: TriageLogEntry): string {
  const lines = [
    `## ${formatTimestamp(entry.loggedAt)} — ${entry.filename}`,
    "",
    `- **Action:** ${entry.action}`,
    `- **Source path:** \`${entry.sourcePath}\``,
    `- **From:** \`${entry.fromFolder}\``,
    `- **To:** \`${entry.toFolder}\``,
    `- **Classification:** ${entry.bucket}`,
    `- **Confidence:** ${entry.confidence}`,
    `- **Reason:** ${entry.reason}`,
  ];
  if (entry.notes) lines.push(`- **Notes:** ${entry.notes}`);
  if (entry.theme) lines.push(`- **Theme:** ${entry.theme}`);
  if (entry.destinationPath) {
    lines.push(`- **Destination:** \`${entry.destinationPath}\``);
  }
  if (entry.sourceNotePath) {
    lines.push(`- **Source note:** [[${path.basename(entry.sourceNotePath, ".md")}]]`);
  }
  lines.push("", "---", "");
  return lines.join("\n");
}

export function renderTriageLogSeed(): string {
  return [
    "---",
    "type: triage-log",
    "source: true-crew-workspace",
    `created_at: ${new Date().toISOString()}`,
    "---",
    "",
    "# Triage Log",
    "",
    "Structured intake log for the TrueCrew research + cleanup workflow.",
    "Bots append here; humans decide what leaves `05-Delete-Candidates`.",
    "",
    "---",
    "",
  ].join("\n");
}

export function renderSheetHeader(): string {
  return [
    "logged_at",
    "filename",
    "source_path",
    "from_folder",
    "to_folder",
    "classification",
    "confidence",
    "reason",
    "action",
    "notes",
    "theme",
    "destination_path",
    "source_note_path",
  ].join(",");
}

export function renderSheetRow(entry: TriageLogEntry): string {
  return [
    entry.loggedAt.toISOString(),
    entry.filename,
    entry.sourcePath,
    entry.fromFolder,
    entry.toFolder,
    entry.bucket,
    entry.confidence,
    entry.reason,
    entry.action,
    entry.notes ?? "",
    entry.theme ?? "",
    entry.destinationPath ?? "",
    entry.sourceNotePath ?? "",
  ]
    .map(csvEscape)
    .join(",");
}

export async function appendTriageLogEntry(
  workspaceRoot: string,
  entry: TriageLogEntry,
  options: { skipObsidian?: boolean; dryRun?: boolean } = {},
): Promise<{ logPath: string | null; sheetPath: string }> {
  const sheetPath = path.join(workspaceRoot, TRIAGE_SHEET_RELATIVE_PATH);
  let logPath: string | null = null;

  if (options.dryRun) {
    return { logPath: null, sheetPath };
  }

  await fs.mkdir(path.dirname(sheetPath), { recursive: true });
  let sheetNeedsHeader = false;
  try {
    await fs.access(sheetPath);
  } catch {
    sheetNeedsHeader = true;
  }

  const sheetLine =
    (sheetNeedsHeader ? `${renderSheetHeader()}\n` : "") +
    `${renderSheetRow(entry)}\n`;
  await fs.appendFile(sheetPath, sheetLine, "utf8");

  if (!options.skipObsidian && isVaultConfigured()) {
    logPath = await appendVaultNote(
      TRIAGE_LOG_VAULT_PATH,
      renderTriageLogSection(entry),
      renderTriageLogSeed(),
    );
  }

  return { logPath, sheetPath };
}
