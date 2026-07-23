import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { mapDbResearchRequestToClient } from "../../lib/mappers/research-requests.js";
import {
  isResearchRequestStatus,
  researchStatusChangeError,
} from "../../lib/research/status.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import { getResearchRequest, updateResearchRequestStatus } from "../../lib/supabase/queries.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) {
    return res.status(400).json({ error: "Request id is required" });
  }

  const body = req.body as {
    status?: unknown;
    filedPath?: unknown;
    blockerNote?: unknown;
  };

  if (typeof body?.status !== "string" || !isResearchRequestStatus(body.status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const filedPath = typeof body.filedPath === "string" ? body.filedPath : undefined;
  const blockerNote = typeof body.blockerNote === "string" ? body.blockerNote : undefined;

  try {
    const current = await getResearchRequest(id);
    if (!current) {
      return res.status(404).json({ error: "Research request not found" });
    }

    // Same transition rules the client enforces (lib/research/status.ts) —
    // the server is the backstop, not a second vocabulary.
    const validationError = researchStatusChangeError(current.status, body.status, {
      filedPath: filedPath ?? current.filed_path,
      blockerNote: blockerNote ?? current.blocker_note,
    });
    if (validationError) {
      return res.status(409).json({ error: validationError });
    }

    const row = await updateResearchRequestStatus(id, body.status, { filedPath, blockerNote });
    if (!row) {
      return res.status(404).json({ error: "Research request not found" });
    }
    return res.status(200).json({ request: mapDbResearchRequestToClient(row) });
  } catch (error) {
    console.error("Failed to update research request", error);
    return res.status(500).json({
      error: "Failed to update research request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
