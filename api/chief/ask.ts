import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import {
  isCloudFallbackEnabled,
  isOllamaFallbackEnabled,
  routeChiefFallback,
} from "../../lib/chief/modelRouter.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isCloudFallbackEnabled() && !isOllamaFallbackEnabled()) {
    return res.status(503).json({ error: "Chief AI fallback is disabled" });
  }

  const body = req.body as { query?: unknown; contextSummary?: unknown; localOnly?: unknown };
  if (typeof body?.query !== "string" || !body.query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  const contextSummary =
    typeof body.contextSummary === "string" ? body.contextSummary.trim() : "";
  const localOnly = body.localOnly === true;

  try {
    const result = await routeChiefFallback(body.query, contextSummary, { localOnly });
    if (!result) {
      return res.status(503).json({ error: "No AI fallback available" });
    }
    return res.status(200).json({
      summary: result.summary,
      model: result.model,
      source: result.source,
      category: result.category,
    });
  } catch (error) {
    console.error("Chief AI fallback failed", error);
    return res.status(502).json({
      error: "Chief AI fallback failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
