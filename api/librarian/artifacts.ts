import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth";
import { createTaskArtifact } from "../../lib/librarian/create";
import { isSupabaseConfigured } from "../../lib/supabase/admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ ok: false, error: "Database not configured" });
  }

  const body = req.body as { taskId?: unknown; useAi?: unknown; actor?: unknown };
  if (typeof body?.taskId !== "string" || !body.taskId.trim()) {
    return res.status(400).json({ ok: false, error: "taskId is required" });
  }

  const actor =
    body.actor === "founder" || body.actor === "operator" || body.actor === "observer"
      ? body.actor
      : "operator";

  try {
    const result = await createTaskArtifact({
      taskId: body.taskId.trim(),
      useAi: body.useAi === true,
      actor,
    });

    return res.status(201).json({
      ok: true,
      workItem: result.workItem,
      artifact: result.artifact,
      vaultWritten: result.vaultWritten,
    });
  } catch (error) {
    if (error instanceof Error && (error as Error & { code?: string }).code === "ARTIFACT_EXISTS") {
      return res.status(409).json({ ok: false, error: error.message });
    }
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ ok: false, error: error.message });
    }
    console.error("Failed to create librarian artifact", error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create artifact",
    });
  }
}
