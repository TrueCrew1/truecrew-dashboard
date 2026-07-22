import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { mapCommandCenterData } from "../../lib/mappers/index.js";
import { fetchRawCommandCenterRows } from "../../lib/supabase/queries.js";
import { isSupabaseConfigured } from "../../lib/supabase/admin.js";
import { mockData } from "../../src/data/mockData.js";
import { buildSearchDataContext } from "../../src/lib/search/context.js";
import { executeUnifiedSearch } from "../../src/lib/search/unifiedSearch.js";
import { dispatchAction } from "../../src/lib/search/actionRouter.js";
import { parseCommand } from "../../src/lib/search/commandParser.js";
import { logSearchEvent } from "../../src/lib/search/observability.js";

async function loadSearchContext() {
  if (!isSupabaseConfigured()) {
    return buildSearchDataContext(mockData, { dataRail: "mock" });
  }

  const raw = await fetchRawCommandCenterRows();
  const data = mapCommandCenterData(raw) as import("../../src/data/mockData.js").MockData;
  return buildSearchDataContext(data, { dataRail: "supabase" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query =
    req.method === "GET"
      ? String(req.query.q ?? "").trim()
      : String((req.body as { query?: unknown })?.query ?? "").trim();

  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

  const dispatch = req.method === "POST";

  try {
    const context = await loadSearchContext();
    const response = executeUnifiedSearch(query, context);

    if (!dispatch) {
      return res.status(200).json(response);
    }

    const intent = parseCommand(query);
    const actionResult = dispatchAction(intent, response);

    logSearchEvent({
      event: actionResult.ok ? "dispatch" : "failure",
      query,
      intent,
      action: actionResult.action,
      route: actionResult.route,
      error: actionResult.error,
    });

    return res.status(200).json({
      ...response,
      actionResult,
    });
  } catch (error) {
    logSearchEvent({
      event: "failure",
      query,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return res.status(500).json({
      error: "Search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
