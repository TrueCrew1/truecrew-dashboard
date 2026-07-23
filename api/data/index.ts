import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { mapCommandCenterData } from "../../lib/mappers/index.js";
import { fetchRawCommandCenterRows } from "../../lib/supabase/queries.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";

function parseView(req: VercelRequest): string {
  const view = req.query?.view;
  return typeof view === "string" ? view.trim() : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const raw = await fetchRawCommandCenterRows();
    const data = mapCommandCenterData(raw);

    // Legacy GET /api/tasks (rewrite → ?view=tasks): tasks subset only.
    if (parseView(req) === "tasks") {
      return res.status(200).json({ tasks: data.tasks, source: "supabase" });
    }

    return res.status(200).json({ ...data, source: "supabase" });
  } catch (error) {
    console.error("Failed to fetch command center data", error);
    return res.status(500).json({
      error: "Failed to fetch data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
