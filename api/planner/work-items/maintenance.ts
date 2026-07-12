import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";
import { isSupabaseConfigured } from "../../../lib/supabase/admin.js";
import {
  fetchPlannerWorkItemsByStatus,
  mapPlannerWorkItemToClient,
} from "../../../lib/supabase/planner-work-items-queries.js";

/** Filtered view: planner work items currently blocked. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;
    const rows = await fetchPlannerWorkItemsByStatus(["blocked"], limit);
    return res.status(200).json({ workItems: rows.map(mapPlannerWorkItemToClient) });
  } catch (error) {
    console.error("Failed to fetch maintenance planner work items view", error);
    return res.status(500).json({
      error: "Failed to fetch planner work items",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
