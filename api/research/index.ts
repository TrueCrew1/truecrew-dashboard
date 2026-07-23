import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { mapDbResearchRequestToClient } from "../../lib/mappers/research-requests.js";
import {
  isResearchRequestStatus,
  researchStatusChangeError,
} from "../../lib/research/status.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import {
  fetchResearchRequests,
  getResearchRequest,
  insertResearchRequest,
  updateResearchRequestStatus,
} from "../../lib/supabase/queries.js";

/**
 * Research queue — list / create / status patch in one function
 * (Hobby 12-function limit: formerly api/research/index + api/research/[id]).
 *
 * Public paths unchanged via vercel.json rewrite:
 *   PATCH /api/research/:id  →  /api/research?id=:id
 * (only req-* ids; dispatch / mission rewrites stay separate).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method === "GET") {
    try {
      const rows = await fetchResearchRequests();
      return res.status(200).json({ requests: rows.map(mapDbResearchRequestToClient) });
    } catch (error) {
      console.error("Failed to fetch research requests", error);
      return res.status(500).json({
        error: "Failed to fetch research requests",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method === "POST") {
    // Operator-created session request. The client builds the full row (id,
    // topic, why/outcome copy, timestamps) via buildSessionResearchRequest;
    // the server pins source/status to session/queued.
    const body = req.body as {
      id?: unknown;
      topic?: unknown;
      whyItMatters?: unknown;
      suggestedOutcome?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
    };

    const fields = [body?.id, body?.topic, body?.whyItMatters, body?.suggestedOutcome] as const;
    if (fields.some((value) => typeof value !== "string" || !value.trim())) {
      return res
        .status(400)
        .json({ error: "id, topic, whyItMatters, and suggestedOutcome are required" });
    }

    const now = new Date().toISOString();
    try {
      const { row, created } = await insertResearchRequest({
        id: (body.id as string).trim(),
        topic: (body.topic as string).trim(),
        why_it_matters: (body.whyItMatters as string).trim(),
        suggested_outcome: (body.suggestedOutcome as string).trim(),
        created_at: typeof body.createdAt === "string" ? body.createdAt : now,
        updated_at: typeof body.updatedAt === "string" ? body.updatedAt : now,
      });

      const request = mapDbResearchRequestToClient(row);
      if (!created) {
        return res.status(409).json({ error: "Request already exists", request });
      }
      return res.status(201).json({ request });
    } catch (error) {
      console.error("Failed to create research request", error);
      return res.status(500).json({
        error: "Failed to create research request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method === "PATCH") {
    const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
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

  return res.status(405).json({ error: "Method not allowed" });
}
