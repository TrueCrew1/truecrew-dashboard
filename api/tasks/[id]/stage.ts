import type { VercelRequest, VercelResponse } from "@vercel/node";
import { canAdvanceStage, getNextStage } from "../../../lib/gates/stage";
import {
  findTaskByClientId,
  isSupabaseConfigured,
  updateTaskStage,
  writeAuditEvent,
} from "../../../lib/supabase/admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const clientId = String(req.query.id ?? "");
  if (!clientId) {
    return res.status(400).json({ error: "Task id is required" });
  }

  const requestedStage =
    typeof req.body === "object" && req.body !== null && "stage" in req.body
      ? String((req.body as { stage: unknown }).stage)
      : "";

  if (!requestedStage) {
    return res.status(400).json({ error: "stage is required" });
  }

  try {
    const task = await findTaskByClientId(clientId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const gates = task.gate_checks ?? [];
    const currentStage = String(task.stage);
    const expectedNext = getNextStage(currentStage);

    if (!canAdvanceStage(currentStage, gates)) {
      return res.status(409).json({
        error: "Task is not ready to advance",
        message: "Clear all required gates before advancing stage",
      });
    }

    if (!expectedNext || requestedStage !== expectedNext) {
      return res.status(400).json({
        error: "Invalid target stage",
        message: expectedNext
          ? `Next stage must be "${expectedNext}"`
          : "Task has no next stage",
      });
    }

    const { from, to } = await updateTaskStage(task.id, requestedStage);

    await writeAuditEvent("task", task.id, "task.stage_advance", { from, to }, "operator");

    return res.status(200).json({
      taskId: clientId,
      from,
      to,
    });
  } catch (error) {
    console.error("Failed to advance task stage", error);
    return res.status(500).json({
      error: "Failed to advance task stage",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
