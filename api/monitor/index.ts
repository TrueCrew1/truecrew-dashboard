import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "../../lib/supabase/admin.js";

interface MonitorSupabaseHealth {
  db_reachable: boolean;
  connection_count: number;
  active_connections: number;
  table_stats: unknown;
  slow_queries: null;
}

type VercelDeployment = {
  state?: string;
  created?: number;
  url?: string;
};

type VercelDeploymentsResponse = {
  deployments?: VercelDeployment[];
};

type DeploymentSummary = {
  state: string;
  createdAt: string;
};

function toCreatedAt(created?: number): string {
  if (typeof created !== "number" || !Number.isFinite(created)) {
    return "";
  }
  return new Date(created).toISOString();
}

function redactSecrets(message: string, token: string | undefined): string {
  if (!token || !message.includes(token)) {
    return message;
  }
  return message.replaceAll(token, "[redacted]");
}

function errorResponse(res: VercelResponse, error: string) {
  return res.status(200).json({ ok: false, error, recent: [] });
}

async function handleSupabase(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

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
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleVercel(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();

  if (!token || !projectId) {
    return errorResponse(
      res,
      "Vercel monitor is not configured — set VERCEL_API_TOKEN and VERCEL_PROJECT_ID in the deployment environment",
    );
  }

  try {
    const url = new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("limit", "5");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Vercel deployments request failed", response.status);
      return errorResponse(res, "Failed to fetch deployments from Vercel");
    }

    const body = (await response.json()) as VercelDeploymentsResponse;
    const deployments = Array.isArray(body.deployments) ? body.deployments : [];

    if (deployments.length === 0) {
      return errorResponse(res, "No deployments found for this project");
    }

    const recent: DeploymentSummary[] = deployments.map((deployment) => ({
      state: deployment.state ?? "UNKNOWN",
      createdAt: toCreatedAt(deployment.created),
    }));

    const latestDeployment = deployments[0];

    return res.status(200).json({
      ok: true,
      latest: {
        state: latestDeployment.state ?? "UNKNOWN",
        createdAt: toCreatedAt(latestDeployment.created),
        url: latestDeployment.url ?? "",
      },
      recent,
    });
  } catch (error) {
    console.error("Vercel monitor request failed", error);
    const message =
      error instanceof Error
        ? redactSecrets(error.message, token)
        : "Failed to fetch Vercel deploy status";
    return errorResponse(res, message);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const target = req.query.target;

  if (target === "supabase") {
    return handleSupabase(req, res);
  }

  if (target === "vercel") {
    return handleVercel(req, res);
  }

  return res.status(400).json({
    error: "Missing or invalid 'target' query param. Expected target=supabase or target=vercel.",
  });
}
