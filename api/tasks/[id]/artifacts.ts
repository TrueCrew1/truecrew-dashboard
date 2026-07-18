import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorMessage, requireMethod, requireSupabase } from "../../../lib/http";
import { listTaskArtifacts } from "../../../lib/librarian/create";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireMethod(req, res, "GET")) return;
  if (!requireSupabase(res)) return;

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
      error: errorMessage(error, "Failed to list artifacts"),
    });
  }
}
