import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildOperationalReadinessSummary } from "../../../lib/chief/operationalReadiness.js";
import { requireInternalAuth } from "../../../lib/auth.js";
import { listApprovalActivityRecords } from "../../../lib/approvals/approvalActivityStore.js";
import { recordApprovalDecisionActivity } from "../../../lib/approvals/recordApprovalDecisionActivity.js";
import {
  formatMonitorStateMessage,
  governedLoopSlack,
  isGovernedChiefApproval,
  scheduleGovernedApprovalUpdatedSlack,
  scheduleGovernedApprovalCreatedSlack,
} from "../../../lib/governedLoopSlack.js";
import { mapDbChiefApprovalDecisionToClient } from "../../../lib/mappers/chief-approvals.js";
import { isVaultConfigured } from "../../../lib/obsidian/config.js";
import { isSupabaseConfigured } from "../../../lib/supabase/admin.js";
import {
  fetchChiefApprovalDecisions,
  insertChiefApprovalDecision,
  isChiefApprovalStatus,
} from "../../../lib/supabase/queries.js";

const PERSONAS = ["founder", "operator", "observer"] as const;

function parseActor(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  return (PERSONAS as readonly string[]).includes(value) ? value : null;
}

function parseView(req: VercelRequest): string {
  const view = req.query?.view;
  return typeof view === "string" ? view.trim() : "";
}

function parseString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseActivityPayload(body: Record<string, unknown> | undefined) {
  const activity = body?.activity;
  if (!activity || typeof activity !== "object") return null;

  const payload = activity as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
  if (!title) return null;

  return {
    title,
    summary,
    source: typeof payload.source === "string" ? payload.source.trim() : undefined,
    category: typeof payload.category === "string" ? payload.category.trim() : undefined,
    missionKind:
      typeof payload.missionKind === "string" ? payload.missionKind.trim() : undefined,
    missionProjectId:
      typeof payload.missionProjectId === "string"
        ? payload.missionProjectId.trim()
        : undefined,
  };
}

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

function isDevEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim();
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  return nodeEnv !== "production" && vercelEnv !== "production";
}

async function handleOperationalReadiness(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json(buildOperationalReadinessSummary());
}

async function handleApprovalActivity(_req: VercelRequest, res: VercelResponse) {
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

async function handleSlackTest(_req: VercelRequest, res: VercelResponse) {
  if (!isDevEnvironment()) {
    return res.status(404).json({ error: "Not found" });
  }

  await governedLoopSlack("Chief governance test: Slack wiring is live.");
  return res.status(200).json({ ok: true });
}

async function handleSlackNotify(req: VercelRequest, res: VercelResponse) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  const view = parseView(req);

  if (req.method === "GET" && view === "activity") {
    return handleApprovalActivity(req, res);
  }

  if (req.method === "GET" && view === "operational-readiness") {
    return handleOperationalReadiness(req, res);
  }

  if (req.method === "POST" && view === "slack-test") {
    return handleSlackTest(req, res);
  }

  if (req.method === "POST" && view === "slack-notify") {
    return handleSlackNotify(req, res);
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method === "GET") {
    try {
      const rows = await fetchChiefApprovalDecisions();
      return res.status(200).json({
        decisions: rows.map(mapDbChiefApprovalDecisionToClient),
      });
    } catch (error) {
      console.error("Failed to fetch chief approval decisions", error);
      return res.status(500).json({
        error: "Failed to fetch approval decisions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method === "POST") {
    const body = req.body as {
      proposalId?: unknown;
      status?: unknown;
      actor?: unknown;
    };

    if (typeof body?.proposalId !== "string" || !body.proposalId.trim()) {
      return res.status(400).json({ error: "proposalId is required" });
    }

    if (typeof body?.status !== "string" || !isChiefApprovalStatus(body.status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const proposalId = body.proposalId.trim();
    const actor = parseActor(body.actor);
    const activityPayload = parseActivityPayload(body as Record<string, unknown>);

    try {
      const { row, created } = await insertChiefApprovalDecision(
        proposalId,
        body.status,
        actor,
      );
      const decision = mapDbChiefApprovalDecisionToClient(row);

      if (!created) {
        return res.status(409).json({
          error: "Already decided",
          decision,
        });
      }

      let activity:
        | { recorded: true; vaultPath: string; obsidianDecisionPath: string }
        | { recorded: false; error: string }
        | undefined;

      if (activityPayload && isVaultConfigured()) {
        try {
          const paths = await recordApprovalDecisionActivity({
            proposalId,
            title: activityPayload.title,
            summary: activityPayload.summary,
            decision: body.status,
            decidedAt: decision.decidedAt,
            actor: decision.actor,
            source: activityPayload.source,
            category: activityPayload.category,
            missionKind: activityPayload.missionKind,
          });
          activity = { recorded: true, ...paths };
        } catch (activityError) {
          console.error("Failed to record approval activity", activityError);
          activity = {
            recorded: false,
            error:
              activityError instanceof Error
                ? activityError.message
                : "Failed to record approval activity",
          };
        }
      } else if (activityPayload && !isVaultConfigured()) {
        activity = {
          recorded: false,
          error: "Obsidian vault is not configured",
        };
      }

      scheduleGovernedApprovalUpdatedSlack({
        approvalId: proposalId,
        status: body.status,
        missionKind: activityPayload?.missionKind,
        missionProjectId: activityPayload?.missionProjectId,
      });

      return res.status(201).json({ decision, activity });
    } catch (error) {
      console.error("Failed to record chief approval decision", error);
      return res.status(500).json({
        error: "Failed to record approval decision",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
