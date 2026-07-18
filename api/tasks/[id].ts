import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { errorMessage, requireMethod, requireSupabase } from "../../lib/http.js";
import { mapDbTaskToClient } from "../../lib/mappers/tasks.js";
import { updateTaskStage } from "../../lib/supabase/queries.js";

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
  if (!requireInternalAuth(req, res)) return;
  if (!requireMethod(req, res, "PATCH")) return;
  if (!requireSupabase(res)) return;

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
      message: errorMessage(error),
    });
  }
}
