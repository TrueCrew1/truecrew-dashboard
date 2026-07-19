import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import {
  formatMonitorStateMessage,
  governedLoopSlack,
  isGovernedChiefApproval,
  scheduleGovernedApprovalCreatedSlack,
} from "../../lib/governedLoopSlack.js";

function parseString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const event = parseString(body.event);

  if (event === "approval_created") {
    const approvalId = parseString(body.approvalId);
    if (!approvalId) {
      return res.status(400).json({ error: "approvalId is required" });
    }

    const missionKind = parseString(body.missionKind);
    const missionProjectId = parseString(body.missionProjectId);

    if (!isGovernedChiefApproval({ proposalId: approvalId, missionKind })) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    scheduleGovernedApprovalCreatedSlack({
      approvalId,
      missionKind,
      missionProjectId,
    });
    return res.status(200).json({ ok: true });
  }

  if (event === "monitor_state") {
    const state = parseString(body.state);
    const probeId = parseString(body.probeId);
    if (!state || !probeId) {
      return res.status(400).json({ error: "state and probeId are required" });
    }

    const incidentId = parseString(body.incidentId);
    await governedLoopSlack(
      formatMonitorStateMessage({ state, probeId, incidentId }),
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unsupported event" });
}
