import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isSupabaseConfigured } from "../lib/supabase/admin";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    ok: true,
    host: "vercel",
    supabase: isSupabaseConfigured(),
    githubWebhook: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
    liveApi: process.env.VITE_USE_LIVE_API === "true",
    timestamp: new Date().toISOString(),
  });
}
