import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";
import {
  fetchChiefApprovalAuditEvents,
  isSupabaseConfigured,
} from "../../../lib/supabase/admin.js";

/**
 * Read-only durable audit trail for Chief approval decisions (entity_type
 * "chief_approval_decision", written by ../../../api/chief/approvals/index.ts).
 * Deliberately scoped to this one entity_type — not a general audit_events
 * browser. See docs/decisions/ADR-001-auditor-system.md.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;
    const rows = await fetchChiefApprovalAuditEvents(limit);

    return res.status(200).json({
      events: rows.map((row) => ({
        id: row.id,
        proposalId: row.entity_id,
        action: row.action,
        status: typeof row.details?.status === "string" ? row.details.status : null,
        actor: row.actor,
        decidedAt:
          typeof row.details?.decidedAt === "string" ? row.details.decidedAt : row.created_at,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch chief approval audit events", error);
    return res.status(500).json({
      error: "Failed to fetch approval audit events",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
