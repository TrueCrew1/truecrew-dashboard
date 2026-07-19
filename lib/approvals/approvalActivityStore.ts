import fs from "node:fs";
import path from "node:path";
import { requireVaultPath } from "../obsidian/config.js";
import { writeVaultNote } from "../obsidian/write.js";
import type { ApprovalActivityRecord } from "./types.js";

const ACTIVITY_DIR = "Operations/Approvals/activity";

function activityRelativePath(proposalId: string): string {
  return `${ACTIVITY_DIR}/${proposalId}.json`;
}

function activityAbsolutePath(proposalId: string): string {
  return path.join(requireVaultPath(), activityRelativePath(proposalId));
}

export async function saveApprovalActivityRecord(
  record: ApprovalActivityRecord,
): Promise<string> {
  const relativePath = activityRelativePath(record.proposalId);
  await writeVaultNote(relativePath, `${JSON.stringify(record, null, 2)}\n`);
  return relativePath;
}

export function readApprovalActivityRecord(proposalId: string): ApprovalActivityRecord | null {
  const absolutePath = activityAbsolutePath(proposalId);
  if (!fs.existsSync(absolutePath)) return null;
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as ApprovalActivityRecord;
}

export function listApprovalActivityRecords(): ApprovalActivityRecord[] {
  const vaultPath = requireVaultPath();
  const dir = path.join(vaultPath, ACTIVITY_DIR);
  if (!fs.existsSync(dir)) return [];

  const records: ApprovalActivityRecord[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    records.push(JSON.parse(raw) as ApprovalActivityRecord);
  }

  return records.sort(
    (a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime(),
  );
}
