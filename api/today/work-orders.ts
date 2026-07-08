import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import { buildEmptyTodayWorkOrdersResponse } from "../../lib/today/emptyResponse.js";
import { getConfiguredTodayOrgContext } from "../../lib/today/orgContext.js";
import { buildRealTodayWorkOrdersResponse } from "../../lib/today/realResponse.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireInternalAuth(req, res)) return;

  const orgContext = getConfiguredTodayOrgContext();
  if (!orgContext) {
    return res.status(403).json({
      error: "No org context configured",
      message: "Organization context is not configured for this deployment.",
    });
  }

  if (!isSupabaseConfigured()) {
    return res.status(200).json(buildEmptyTodayWorkOrdersResponse(orgContext));
  }

  try {
    const response = await buildRealTodayWorkOrdersResponse(orgContext);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Failed to build Today work orders response", error);
    return res.status(500).json({
      error: "Failed to load work orders",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
