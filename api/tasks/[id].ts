import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { listTaskArtifacts } from "../../lib/librarian/create.js";
import { mapDbTaskToClient } from "../../lib/mappers/tasks.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
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

function parseView(req: VercelRequest): string {
  const view = req.query.view;
  return typeof view === "string" ? view.trim() : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  const taskId = req.query.id;
  if (typeof taskId !== "string" || !taskId) {
    return res.status(400).json({ error: "Task id is required" });
  }

  if (req.method === "GET" && parseView(req) === "artifacts") {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ ok: false, error: "Database not configured" });
    }

    try {
      const artifacts = await listTaskArtifacts(taskId);
      return res.status(200).json({ ok: true, artifacts });
    } catch (error) {
      if (error instanceof Error && error.message === "Task not found") {
        return res.status(404).json({ ok: false, error: error.message });
      }
      console.error("Failed to list task artifacts", error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list artifacts",
      });
    }
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
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
