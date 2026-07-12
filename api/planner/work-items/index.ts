import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";
import { validatePlannerWorkItemInput } from "../../../lib/planner-work-items/validate-payload.js";
import { isSupabaseConfigured } from "../../../lib/supabase/admin.js";
import {
  fetchPlannerWorkItems,
  insertPlannerWorkItem,
  mapPlannerWorkItemToClient,
} from "../../../lib/supabase/planner-work-items-queries.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method === "GET") {
    try {
      const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;
      const rows = await fetchPlannerWorkItems(limit);
      return res.status(200).json({ workItems: rows.map(mapPlannerWorkItemToClient) });
    } catch (error) {
      console.error("Failed to fetch planner work items", error);
      return res.status(500).json({
        error: "Failed to fetch planner work items",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let input;
  try {
    input = validatePlannerWorkItemInput(req.body);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid request body",
    });
  }

  try {
    const row = await insertPlannerWorkItem(input);
    return res.status(201).json({ workItem: mapPlannerWorkItemToClient(row) });
  } catch (error) {
    console.error("Failed to create planner work item", error);
    return res.status(500).json({
      error: "Failed to create planner work item",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
