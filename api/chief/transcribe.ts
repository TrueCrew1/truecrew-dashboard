import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { isChiefVoiceEnabled } from "../../lib/chief-ai/config.js";
import { transcribeAudio } from "../../lib/chief-ai/voice.js";

// Base64 JSON body rather than multipart — keeps this route dependency-free
// and matches the repo's file-upload-not-streaming voice v1 scope.
const MAX_BASE64_LENGTH = 15_000_000; // ~11MB decoded, plenty for a short voice note

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isChiefVoiceEnabled()) {
    return res.status(503).json({ error: "Voice is not enabled" });
  }

  const body = req.body as { audioBase64?: unknown; mimeType?: unknown };

  if (typeof body?.audioBase64 !== "string" || !body.audioBase64) {
    return res.status(400).json({ error: "audioBase64 is required" });
  }

  if (body.audioBase64.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({ error: "Audio payload too large" });
  }

  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "audio/webm";

  try {
    const text = await transcribeAudio(body.audioBase64, mimeType);
    return res.status(200).json({ text });
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: "chief_voice_transcribe",
        ok: false,
        message: error instanceof Error ? error.message : "unknown error",
      }),
    );
    return res.status(502).json({ error: "Transcription failed" });
  }
}
