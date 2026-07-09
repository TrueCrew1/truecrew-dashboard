import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createMaintenanceNote } from "../../lib/maintenance/create";
import { isSupabaseConfigured } from "../../lib/supabase/admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ ok: false, error: "Database not configured" });
  }

  const body = req.body as { taskId?: unknown; actor?: unknown };
  if (typeof body?.taskId !== "string" || !body.taskId.trim()) {
    return res.status(400).json({ ok: false, error: "taskId is required" });
  }

  const actor =
    body.actor === "founder" || body.actor === "operator" || body.actor === "observer"
      ? body.actor
      : "operator";

  try {
    const result = await createMaintenanceNote({
      taskId: body.taskId.trim(),
      actor,
    });

    return res.status(201).json({
      ok: true,
      workItem: result.workItem,
      note: result.note,
      vaultWritten: result.vaultWritten,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ ok: false, error: error.message });
    }
    console.error("Failed to create maintenance note", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create maintenance note",
    });
  }
}
