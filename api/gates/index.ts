import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  failGateForTasks,
  isSupabaseConfigured,
  passGateForTasks,
  resolveTaskUuid,
  writeAuditEvent,
} from "../../lib/supabase/admin";

type GateAction = "pass" | "fail";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
    taskId?: string;
    gateKey?: string;
    action?: GateAction;
  };

  const { taskId, gateKey, action } = body;

  if (!taskId || !gateKey || (action !== "pass" && action !== "fail")) {
    return res.status(400).json({
      error: "Invalid request",
      message: "taskId, gateKey, and action (pass|fail) are required",
    });
  }

  try {
    const taskUuid = await resolveTaskUuid(taskId);
    if (!taskUuid) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updated =
      action === "pass"
        ? await passGateForTasks([taskUuid], gateKey, "manual")
        : await failGateForTasks([taskUuid], gateKey, "manual");

    await writeAuditEvent(
      "task",
      taskUuid,
      action === "pass" ? "gate.pass" : "gate.fail",
      { gateKey, taskId, source: "manual" },
      "operator",
    );

    return res.status(200).json({ ok: true, updated, taskId: taskUuid, gateKey, action });
  } catch (error) {
    console.error("Failed to update gate", error);
    return res.status(500).json({
      error: "Failed to update gate",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
