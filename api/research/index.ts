import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { mapDbResearchRequestToClient } from "../../lib/mappers/research-requests.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import { fetchResearchRequests, insertResearchRequest } from "../../lib/supabase/queries.js";

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

  return res.status(405).json({ error: "Method not allowed" });
}
