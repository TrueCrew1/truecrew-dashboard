import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mapDbTaskToClient } from "../../lib/mappers/tasks";
import { isSupabaseConfigured } from "../../lib/supabase/admin";
import { updateTaskStage } from "../../lib/supabase/queries";

const VALID_STAGES = [
  "Inbox",
  "Triage",
  "Planned",
  "In Progress",
  "Waiting",
  "Review",
  "Done",
  "Logged",
] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const taskId = req.query.id;
  if (typeof taskId !== "string" || !taskId) {
    return res.status(400).json({ error: "Task id is required" });
  }

  const body = req.body as { stage?: unknown };
  if (typeof body?.stage !== "string") {
    return res.status(400).json({ error: "stage is required" });
  }

  if (!VALID_STAGES.includes(body.stage as (typeof VALID_STAGES)[number])) {
    return res.status(400).json({ error: "Invalid stage value" });
  }

  try {
    const row = await updateTaskStage(taskId, body.stage);
    const task = mapDbTaskToClient(row);
    return res.status(200).json({ task });
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    console.error("Failed to update task stage", error);
    return res.status(500).json({
      error: "Failed to update task",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
