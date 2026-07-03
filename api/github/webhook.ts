import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buffer } from "node:stream/consumers";
import { dispatchGithubEvent } from "../../lib/github/handlers.js";
import { verifyGithubSignature } from "../../lib/github/verify.js";
import {
  isSupabaseConfigured,
  recordWebhookDelivery,
} from "../../lib/supabase/admin.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  if (!isSupabaseConfigured()) {
    console.error("Supabase is not configured");
    return res.status(500).json({ error: "Database not configured" });
  }

  const deliveryId = req.headers["x-github-delivery"];
  const eventType = req.headers["x-github-event"];
  const signature = req.headers["x-hub-signature-256"];

  if (typeof deliveryId !== "string" || typeof eventType !== "string") {
    return res.status(400).json({ error: "Missing GitHub delivery headers" });
  }

  const rawBody = await buffer(req);
  const bodyText = rawBody.toString("utf8");

  if (!verifyGithubSignature(bodyText, typeof signature === "string" ? signature : null, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  const repo =
    typeof payload.repository === "object" &&
    payload.repository &&
    "full_name" in payload.repository
      ? String((payload.repository as { full_name: string }).full_name)
      : null;

  const action = typeof payload.action === "string" ? payload.action : null;

  const isNew = await recordWebhookDelivery(deliveryId, eventType, action, repo);
  if (!isNew) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  try {
    const result = await dispatchGithubEvent(eventType, payload);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("GitHub webhook processing failed", error);
    return res.status(500).json({
      error: "Webhook processing failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
