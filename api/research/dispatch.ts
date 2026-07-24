import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../../lib/missions/types.js";
import {
  listMonitorIncidentPostmortemMissions,
  readMonitorIncidentPostmortemMissionByProposal,
} from "../../lib/missions/monitorIncidentPostmortemStore.js";
import {
  listProjectSummaryHandoffMissions,
  readProjectSummaryHandoffMissionByProposal,
} from "../../lib/missions/projectSummaryHandoffStore.js";
import { executeMonitorIncidentPostmortem } from "../../lib/research/monitorIncidentPostmortem.js";
import { executeProjectSummaryHandoff } from "../../lib/research/projectSummaryHandoff.js";
import { isVaultConfigured } from "../../lib/obsidian/config.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import {
  getChiefApprovalDecision,
  fetchResearchRequests,
  insertResearchRequest,
  getResearchRequest,
  updateResearchRequestStatus,
} from "../../lib/supabase/queries.js";
import { mapDbResearchRequestToClient } from "../../lib/mappers/research-requests.js";
import {
  isResearchRequestStatus,
  researchStatusChangeError,
} from "../../lib/research/status.js";

const HANDOFF_KIND = "project-summary-handoff";
const POSTMORTEM_KIND = "monitor-incident-postmortem";

function parseKind(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === HANDOFF_KIND || raw === POSTMORTEM_KIND) return raw;
  return null;
}

function mapHandoffMission(
  mission: ReturnType<typeof readProjectSummaryHandoffMissionByProposal>,
) {
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

function mapPostmortemMission(
  mission: ReturnType<typeof readMonitorIncidentPostmortemMissionByProposal>,
) {
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

async function handleHandoff(req: VercelRequest, res: VercelResponse) {
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
        return res.status(200).json({ ok: true, mission: mapHandoffMission(mission) });
      }

      if (!isVaultConfigured()) {
        return res.status(200).json({ ok: true, missions: [] });
      }

      const missions = listProjectSummaryHandoffMissions().map((mission) =>
        mapHandoffMission(mission),
      );
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
      mission.status === "completed" ? 200 : mission.status === "failed" ? 422 : 503;

    return res.status(statusCode).json({
      ok: mission.status === "completed",
      mission: mapHandoffMission(mission),
    });
  } catch (error) {
    console.error("Failed to execute project summary handoff", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to execute mission",
    });
  }
}

async function handlePostmortem(req: VercelRequest, res: VercelResponse) {
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
        return res.status(200).json({ ok: true, mission: mapPostmortemMission(mission) });
      }

      if (!isVaultConfigured()) {
        return res.status(200).json({ ok: true, missions: [] });
      }

      const missions = listMonitorIncidentPostmortemMissions().map((mission) =>
        mapPostmortemMission(mission),
      );
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
      mission: mapPostmortemMission(mission),
    });
  } catch (error) {
    console.error("Failed to execute monitor incident postmortem", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to execute mission",
    });
  }
}

// ---------------------------------------------------------------------------
// Research requests (the operator's research queue — GET/POST /api/research,
// PATCH /api/research/:id, both rewritten here by vercel.json). Folded into
// this same function file rather than given their own api/research/index.ts
// and api/research/[id].ts files: Vercel's Hobby plan caps a deployment at
// 12 Serverless Functions, main was already sitting at that limit, and this
// file already uses query-param dispatch for the two mission kinds above —
// same pattern, same file, no new function slot spent. See
// docs/RESEARCH_RUNNER.md for what these routes are for.

async function handleResearchRequestsList(req: VercelRequest, res: VercelResponse) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method === "GET") {
    try {
      const rows = await fetchResearchRequests();
      return res.status(200).json({ requests: rows.map(mapDbResearchRequestToClient) });
    } catch (error) {
      console.error("Failed to fetch research requests", error);
      return res.status(500).json({
        error: "Failed to fetch research requests",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method === "POST") {
    // Operator-created session request. The client builds the full row (id,
    // topic, why/outcome copy, timestamps) via buildSessionResearchRequest;
    // the server pins source/status to session/queued.
    const body = req.body as {
      id?: unknown;
      topic?: unknown;
      whyItMatters?: unknown;
      suggestedOutcome?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
    };

    const fields = [body?.id, body?.topic, body?.whyItMatters, body?.suggestedOutcome] as const;
    if (fields.some((value) => typeof value !== "string" || !value.trim())) {
      return res
        .status(400)
        .json({ error: "id, topic, whyItMatters, and suggestedOutcome are required" });
    }

    const now = new Date().toISOString();
    try {
      const { row, created } = await insertResearchRequest({
        id: (body.id as string).trim(),
        topic: (body.topic as string).trim(),
        why_it_matters: (body.whyItMatters as string).trim(),
        suggested_outcome: (body.suggestedOutcome as string).trim(),
        created_at: typeof body.createdAt === "string" ? body.createdAt : now,
        updated_at: typeof body.updatedAt === "string" ? body.updatedAt : now,
      });

      const request = mapDbResearchRequestToClient(row);
      if (!created) {
        return res.status(409).json({ error: "Request already exists", request });
      }
      return res.status(201).json({ request });
    } catch (error) {
      console.error("Failed to create research request", error);
      return res.status(500).json({
        error: "Failed to create research request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

async function handleResearchRequestUpdate(req: VercelRequest, res: VercelResponse, id: string) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as {
    status?: unknown;
    filedPath?: unknown;
    blockerNote?: unknown;
  };

  if (typeof body?.status !== "string" || !isResearchRequestStatus(body.status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const filedPath = typeof body.filedPath === "string" ? body.filedPath : undefined;
  const blockerNote = typeof body.blockerNote === "string" ? body.blockerNote : undefined;

  try {
    const current = await getResearchRequest(id);
    if (!current) {
      return res.status(404).json({ error: "Research request not found" });
    }

    // Same transition rules the client enforces (lib/research/status.ts) —
    // the server is the backstop, not a second vocabulary.
    const validationError = researchStatusChangeError(current.status, body.status, {
      filedPath: filedPath ?? current.filed_path,
      blockerNote: blockerNote ?? current.blocker_note,
    });
    if (validationError) {
      return res.status(409).json({ error: validationError });
    }

    const row = await updateResearchRequestStatus(id, body.status, { filedPath, blockerNote });
    if (!row) {
      return res.status(404).json({ error: "Research request not found" });
    }
    return res.status(200).json({ request: mapDbResearchRequestToClient(row) });
  } catch (error) {
    console.error("Failed to update research request", error);
    return res.status(500).json({
      error: "Failed to update research request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  const kind = parseKind(req.query.kind);
  if (kind === HANDOFF_KIND) {
    return handleHandoff(req, res);
  }
  if (kind === POSTMORTEM_KIND) {
    return handlePostmortem(req, res);
  }

  // No mission kind: this is a research-request queue call — vercel.json
  // rewrites /api/research/:id to ?id=:id for PATCH, and /api/research
  // (bare) here with neither param for GET/POST.
  const id = typeof req.query.id === "string" ? req.query.id : null;
  if (id) {
    return handleResearchRequestUpdate(req, res, id);
  }
  return handleResearchRequestsList(req, res);
}
