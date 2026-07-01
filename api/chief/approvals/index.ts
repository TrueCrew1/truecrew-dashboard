import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mapDbChiefApprovalDecisionToClient } from "../../../lib/mappers/chief-approvals.js";
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

      return res.status(201).json({ decision });
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
