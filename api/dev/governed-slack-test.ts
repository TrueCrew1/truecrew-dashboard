import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { governedLoopSlack } from "../../lib/governedLoopSlack.js";

function isDevEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim();
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  return nodeEnv !== "production" && vercelEnv !== "production";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isDevEnvironment()) {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  await governedLoopSlack("Chief governance test: Slack wiring is live.");
  return res.status(200).json({ ok: true });
}
