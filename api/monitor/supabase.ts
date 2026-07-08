import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { errorMessage, requireSupabase } from "../../lib/http.js";
import { getSupabaseAdmin } from "../../lib/supabase/admin.js";

interface MonitorSupabaseHealth {
  db_reachable: boolean;
  connection_count: number;
  active_connections: number;
  table_stats: unknown;
  slow_queries: null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;
  if (!requireSupabase(res)) return;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("monitor_supabase_health");

    if (error) throw error;

    const health = data as MonitorSupabaseHealth;

    return res.status(200).json({
      ok: true,
      db_reachable: health.db_reachable,
      connection_count: health.connection_count,
      active_connections: health.active_connections,
      table_stats: health.table_stats,
      slow_queries: health.slow_queries,
    });
  } catch (error) {
    console.error("Failed to fetch Supabase health", error);
    return res.status(500).json({
      error: "Failed to fetch Supabase health",
      message: errorMessage(error),
    });
  }
}
