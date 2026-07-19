import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND } from "../../lib/missions/types.js";
import {
  listProjectSummaryHandoffMissions,
  readProjectSummaryHandoffMissionByProposal,
} from "../../lib/missions/projectSummaryHandoffStore.js";
import { executeProjectSummaryHandoff } from "../../lib/research/projectSummaryHandoff.js";
import { isVaultConfigured } from "../../lib/obsidian/config.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import {
  getChiefApprovalDecision,
} from "../../lib/supabase/queries.js";

function mapMission(mission: ReturnType<typeof readProjectSummaryHandoffMissionByProposal>) {
  if (!mission) return null;
  return {
    id: mission.id,
    kind: mission.kind,
    status: mission.status,
    projectId: mission.projectId,
    projectTitle: mission.projectTitle,
    proposalId: mission.proposalId,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
    startedAt: mission.startedAt,
    completedAt: mission.completedAt,
    error: mission.error,
    outputNotePath: mission.outputNotePath,
    handoffArtifactPath: mission.handoffArtifactPath,
    handoff: mission.handoff,
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
        const mission = readProjectSummaryHandoffMissionByProposal(proposalId);
        if (!mission) {
          return res.status(404).json({ ok: false, error: "Mission not found" });
        }
        return res.status(200).json({ ok: true, mission: mapMission(mission) });
      }

      if (!isVaultConfigured()) {
        return res.status(200).json({ ok: true, missions: [] });
      }

      const missions = listProjectSummaryHandoffMissions().map((mission) => mapMission(mission));
      return res.status(200).json({ ok: true, missions });
    } catch (error) {
      console.error("Failed to read project summary handoff mission", error);
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
    projectId?: unknown;
    missionKind?: unknown;
  };

  if (typeof body?.proposalId !== "string" || !body.proposalId.trim()) {
    return res.status(400).json({ ok: false, error: "proposalId is required" });
  }

  if (typeof body?.projectId !== "string" || !body.projectId.trim()) {
    return res.status(400).json({ ok: false, error: "projectId is required" });
  }

  if (
    typeof body?.missionKind === "string" &&
    body.missionKind !== RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND
  ) {
    return res.status(400).json({ ok: false, error: "Unsupported mission kind" });
  }

  const proposalId = body.proposalId.trim();
  const projectId = body.projectId.trim();

  try {
    const decision = await getChiefApprovalDecision(proposalId);
    if (!decision || decision.status !== "approved") {
      return res.status(409).json({
        ok: false,
        error: "Mission requires an approved Chief decision before execution",
        decisionStatus: decision?.status ?? null,
      });
    }

    const mission = await executeProjectSummaryHandoff({ proposalId, projectId });
    const statusCode =
      mission.status === "completed"
        ? 200
        : mission.status === "failed"
          ? 422
          : 503;

    return res.status(statusCode).json({
      ok: mission.status === "completed",
      mission: mapMission(mission),
    });
  } catch (error) {
    console.error("Failed to execute project summary handoff", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to execute mission",
    });
  }
}
