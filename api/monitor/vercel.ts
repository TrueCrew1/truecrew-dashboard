import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return errorResponse(res, "Vercel monitor is not configured");
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
