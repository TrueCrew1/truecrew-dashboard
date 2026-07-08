import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth";
import { listTaskArtifacts } from "../../../lib/librarian/create";
import { isSupabaseConfigured } from "../../../lib/supabase/admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ ok: false, error: "Database not configured" });
  }

  const taskId = req.query.id;
  if (typeof taskId !== "string" || !taskId) {
    return res.status(400).json({ ok: false, error: "Task id is required" });
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
