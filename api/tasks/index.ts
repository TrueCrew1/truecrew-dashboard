import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mapCommandCenterData } from "../../lib/mappers/index.js";
import { fetchRawCommandCenterRows } from "../../lib/supabase/queries.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const raw = await fetchRawCommandCenterRows();
    const data = mapCommandCenterData(raw);
    return res.status(200).json({ tasks: data.tasks, source: "supabase" });
  } catch (error) {
    console.error("Failed to fetch tasks", error);
    return res.status(500).json({
      error: "Failed to fetch tasks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
