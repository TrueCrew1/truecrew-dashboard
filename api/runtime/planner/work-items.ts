import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { inputPayload } = req.body as { inputPayload?: unknown };

  return res.status(200).json({
    ok: true,
    message: "work-items route is alive",
    received: inputPayload,
  });
}
