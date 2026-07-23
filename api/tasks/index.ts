import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { listTaskArtifacts } from "../../lib/librarian/create.js";
import { mapCommandCenterData } from "../../lib/mappers/index.js";
import { mapDbTaskToClient } from "../../lib/mappers/tasks.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import { fetchRawCommandCenterRows, updateTaskStage } from "../../lib/supabase/queries.js";

/**
 * Tasks list + per-task PATCH / artifacts — one function
 * (Hobby 12-function limit: formerly api/tasks/index + api/tasks/[id]).
 *
 * Public paths unchanged via vercel.json:
 *   PATCH /api/tasks/:id              → /api/tasks?id=:id
 *   GET   /api/tasks/:id/artifacts    → /api/tasks?id=:id&view=artifacts
 */

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

function parseTaskId(req: VercelRequest): string {
  const taskId = req.query.id;
  return typeof taskId === "string" ? taskId.trim() : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  const taskId = parseTaskId(req);

  // Per-task artifacts (rewritten from /api/tasks/:id/artifacts)
  if (req.method === "GET" && taskId && parseView(req) === "artifacts") {
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

  // Per-task stage update (rewritten from /api/tasks/:id)
  if (req.method === "PATCH") {
    if (!taskId) {
      return res.status(400).json({ error: "Task id is required" });
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

  // Collection list (GET /api/tasks)
  if (req.method === "GET" && !taskId) {
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

  return res.status(405).json({ error: "Method not allowed" });
}
