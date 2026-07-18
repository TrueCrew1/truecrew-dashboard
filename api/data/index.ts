import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { errorMessage, requireSupabase } from "../../lib/http.js";
import { mapCommandCenterData } from "../../lib/mappers/index.js";
import { fetchRawCommandCenterRows } from "../../lib/supabase/queries.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;
  if (!requireSupabase(res)) return;

  try {
    const raw = await fetchRawCommandCenterRows();
    const data = mapCommandCenterData(raw);
    return res.status(200).json({ ...data, source: "supabase" });
  } catch (error) {
    console.error("Failed to fetch command center data", error);
    return res.status(500).json({
      error: "Failed to fetch data",
      message: errorMessage(error),
    });
  }
}
