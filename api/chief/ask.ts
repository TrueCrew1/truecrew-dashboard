import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { routeChiefAiRequest } from "../../lib/chief-ai/router.js";

const MAX_INPUT_LENGTH = 2000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as { query?: unknown; deterministicSummary?: unknown };

  if (typeof body?.query !== "string" || !body.query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  const query = body.query.trim().slice(0, MAX_INPUT_LENGTH);
  const deterministicSummary =
    typeof body.deterministicSummary === "string"
      ? body.deterministicSummary.trim().slice(0, MAX_INPUT_LENGTH)
      : undefined;

  try {
    const result = await routeChiefAiRequest({ query, deterministicSummary });
    return res.status(200).json(result);
  } catch (error) {
    // routeChiefAiRequest is designed to never throw (it always resolves to a
    // canned fallback) — this is a defense-in-depth fail-closed path in case
    // that contract is ever violated, not the expected route.
    console.error("Chief AI routing threw unexpectedly", error);
    return res.status(500).json({ error: "Chief AI routing failed" });
  }
}
