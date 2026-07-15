import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import {
  askAzureAi,
  isAzureAiConfigured,
  type AzureAiDeployment,
} from "../../lib/azureAi/client.js";

const DEPLOYMENTS: readonly AzureAiDeployment[] = [
  "deepseek-v4-pro",
  "gpt-5-mini",
  "kimi-k2-6",
];

function resolveFallbackDeployment(): AzureAiDeployment {
  const configured = process.env.CHIEF_AI_FALLBACK_MODEL?.trim();
  return (DEPLOYMENTS as readonly string[]).includes(configured ?? "")
    ? (configured as AzureAiDeployment)
    : "gpt-5-mini";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (process.env.CHIEF_AI_FALLBACK_ENABLED !== "true") {
    return res.status(503).json({ error: "Chief AI fallback is disabled" });
  }

  const deployment = resolveFallbackDeployment();
  if (!isAzureAiConfigured(deployment)) {
    return res.status(503).json({ error: `Azure AI deployment "${deployment}" is not configured` });
  }

  const body = req.body as { query?: unknown; contextSummary?: unknown };
  if (typeof body?.query !== "string" || !body.query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  const contextSummary =
    typeof body.contextSummary === "string" ? body.contextSummary.trim() : "";

  try {
    const content = await askAzureAi(deployment, [
      {
        role: "system",
        content:
          "You are Chief, an operations assistant for a field-ops/maintenance SaaS. " +
          "Answer the operator's question in 2-3 plain, practical sentences. " +
          "No marketing language. If the live context below doesn't cover the question, say so plainly.",
      },
      {
        role: "user",
        content: contextSummary
          ? `Live context: ${contextSummary}\n\nQuestion: ${body.query}`
          : body.query,
      },
    ]);

    return res.status(200).json({ summary: content, model: deployment });
  } catch (error) {
    console.error("Chief AI fallback failed", error);
    return res.status(502).json({
      error: "Chief AI fallback failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
