import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { mapCommandCenterData } from "../../lib/mappers/index.js";
import { fetchRawCommandCenterRows } from "../../lib/supabase/queries.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      error: "Database not configured",
      code: "SUPABASE_NOT_CONFIGURED",
      hint:
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or set VITE_USE_LIVE_API=false to use mock data.",
    });
  }

  try {
    const raw = await fetchRawCommandCenterRows();
    const data = mapCommandCenterData(raw);
    console.log("[data-rail] live_path_used", { route: "/api/tasks" });
    return res.status(200).json({ tasks: data.tasks, source: "supabase" });
  } catch (error) {
    console.error("[data-rail] live_path_error", {
      route: "/api/tasks",
      code: "SUPABASE_FETCH_FAILED",
      error,
    });
    return res.status(500).json({
      error: "Failed to fetch tasks",
      code: "SUPABASE_FETCH_FAILED",
      message: error instanceof Error ? error.message : "Unknown error",
      hint: "Check Supabase connectivity/credentials; see server logs for the underlying error.",
    });
  }
}
