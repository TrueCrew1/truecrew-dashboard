import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";
import { listApprovalActivityRecords } from "../../../lib/approvals/approvalActivityStore.js";
import { isVaultConfigured } from "../../../lib/obsidian/config.js";

function mapActivityRecord(record: ReturnType<typeof listApprovalActivityRecords>[number]) {
  return {
    proposalId: record.proposalId,
    title: record.title,
    summary: record.summary,
    decision: record.decision,
    decidedAt: record.decidedAt,
    actor: record.actor,
    source: record.source ?? null,
    category: record.category ?? null,
    missionKind: record.missionKind ?? null,
    recordedAt: record.recordedAt,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isVaultConfigured()) {
    return res.status(200).json({ activity: [], vaultConfigured: false });
  }

  try {
    const activity = listApprovalActivityRecords().map(mapActivityRecord);
    return res.status(200).json({ activity, vaultConfigured: true });
  } catch (error) {
    console.error("Failed to list approval activity", error);
    return res.status(500).json({
      error: "Failed to list approval activity",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
