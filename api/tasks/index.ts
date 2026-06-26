import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchTasksWithGates, isSupabaseConfigured } from "../../lib/supabase/admin";
import { mapDbTaskToClient } from "../../lib/mappers/tasks";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const rows = await fetchTasksWithGates();
    return res.status(200).json({
      tasks: rows.map(mapDbTaskToClient),
      source: "supabase",
    });
  } catch (error) {
    console.error("Failed to fetch tasks", error);
    return res.status(500).json({
      error: "Failed to fetch tasks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
