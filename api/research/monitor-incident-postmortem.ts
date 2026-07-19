import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND } from "../../lib/missions/types.js";
import {
  listMonitorIncidentPostmortemMissions,
  readMonitorIncidentPostmortemMissionByProposal,
} from "../../lib/missions/monitorIncidentPostmortemStore.js";
import { executeMonitorIncidentPostmortem } from "../../lib/research/monitorIncidentPostmortem.js";
import { isVaultConfigured } from "../../lib/obsidian/config.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import { getChiefApprovalDecision } from "../../lib/supabase/queries.js";

function mapMission(mission: ReturnType<typeof readMonitorIncidentPostmortemMissionByProposal>) {
  if (!mission) return null;
  return {
    id: mission.id,
    kind: mission.kind,
    status: mission.status,
    incidentId: mission.incidentId,
    incidentTitle: mission.incidentTitle,
    serviceName: mission.serviceName,
    proposalId: mission.proposalId,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
    startedAt: mission.startedAt,
    completedAt: mission.completedAt,
    error: mission.error,
    outputNotePath: mission.outputNotePath,
    handoffArtifactPath: mission.handoffArtifactPath,
    postmortem: mission.postmortem,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method === "GET") {
    const proposalId =
      typeof req.query.proposalId === "string" ? req.query.proposalId.trim() : "";

    try {
      if (proposalId) {
        if (!isVaultConfigured()) {
          return res.status(503).json({ ok: false, error: "Obsidian vault is not configured" });
        }
        const mission = readMonitorIncidentPostmortemMissionByProposal(proposalId);
        if (!mission) {
          return res.status(404).json({ ok: false, error: "Mission not found" });
        }
        return res.status(200).json({ ok: true, mission: mapMission(mission) });
      }

      if (!isVaultConfigured()) {
        return res.status(200).json({ ok: true, missions: [] });
      }

      const missions = listMonitorIncidentPostmortemMissions().map((mission) => mapMission(mission));
      return res.status(200).json({ ok: true, missions });
    } catch (error) {
      console.error("Failed to read monitor incident postmortem mission", error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read mission",
      });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ ok: false, error: "Database not configured" });
  }

  if (!isVaultConfigured()) {
    return res.status(503).json({ ok: false, error: "Obsidian vault is not configured" });
  }

  const body = req.body as {
    proposalId?: unknown;
    incidentId?: unknown;
    missionKind?: unknown;
  };

  if (typeof body?.proposalId !== "string" || !body.proposalId.trim()) {
    return res.status(400).json({ ok: false, error: "proposalId is required" });
  }

  if (typeof body?.incidentId !== "string" || !body.incidentId.trim()) {
    return res.status(400).json({ ok: false, error: "incidentId is required" });
  }

  if (
    typeof body?.missionKind === "string" &&
    body.missionKind !== RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND
  ) {
    return res.status(400).json({ ok: false, error: "Unsupported mission kind" });
  }

  const proposalId = body.proposalId.trim();
  const incidentId = body.incidentId.trim();

  try {
    const decision = await getChiefApprovalDecision(proposalId);
    if (!decision || decision.status !== "approved") {
      return res.status(409).json({
        ok: false,
        error: "Mission requires an approved Chief decision before execution",
        decisionStatus: decision?.status ?? null,
      });
    }

    const mission = await executeMonitorIncidentPostmortem({ proposalId, incidentId });
    const statusCode =
      mission.status === "completed" ? 200 : mission.status === "failed" ? 422 : 503;

    return res.status(statusCode).json({
      ok: mission.status === "completed",
      mission: mapMission(mission),
    });
  } catch (error) {
    console.error("Failed to execute monitor incident postmortem", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to execute mission",
    });
  }
}
