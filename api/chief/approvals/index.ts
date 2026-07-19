import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";
import { recordApprovalDecisionActivity } from "../../../lib/approvals/recordApprovalDecisionActivity.js";
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
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

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
