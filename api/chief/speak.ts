import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { isChiefVoiceEnabled } from "../../lib/chief-ai/config.js";
import { synthesizeSpeech } from "../../lib/chief-ai/voice.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isChiefVoiceEnabled()) {
    return res.status(503).json({ error: "Voice is not enabled" });
  }

  const body = req.body as { text?: unknown };

  if (typeof body?.text !== "string" || !body.text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const result = await synthesizeSpeech(body.text);
    return res.status(200).json(result);
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: "chief_voice_speak",
        ok: false,
        message: error instanceof Error ? error.message : "unknown error",
      }),
    );
    return res.status(502).json({ error: "Speech synthesis failed" });
  }
}
