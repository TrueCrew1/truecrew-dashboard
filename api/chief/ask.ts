import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import { isChiefVoiceEnabled } from "../../lib/chief-ai/config.js";
import { routeChiefAiRequest } from "../../lib/chief-ai/router.js";
import { synthesizeSpeech, transcribeAudio } from "../../lib/chief-ai/voice.js";

const MAX_INPUT_LENGTH = 2000;
const MAX_BASE64_LENGTH = 15_000_000; // ~11MB decoded, plenty for a short voice note

/**
 * Single physical Serverless Function backing three public routes —
 * /api/chief/ask, /api/chief/transcribe, /api/chief/speak — consolidated to
 * stay within Vercel Hobby's 12-function-per-deployment cap. vercel.json
 * rewrites the transcribe/speak URLs onto this file via a ?route= query
 * param; each handler below is otherwise byte-for-byte unchanged from its
 * original standalone file — same auth, same gating, same status codes,
 * same response shape.
 */

async function handleAsk(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as { query?: unknown; deterministicSummary?: unknown };

  if (typeof body?.query !== "string" || !body.query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  const query = body.query.trim().slice(0, MAX_INPUT_LENGTH);
  const deterministicSummary =
    typeof body.deterministicSummary === "string"
      ? body.deterministicSummary.trim().slice(0, MAX_INPUT_LENGTH)
      : undefined;

  try {
    const result = await routeChiefAiRequest({ query, deterministicSummary });
    return res.status(200).json(result);
  } catch (error) {
    // routeChiefAiRequest is designed to never throw (it always resolves to a
    // canned fallback) — this is a defense-in-depth fail-closed path in case
    // that contract is ever violated, not the expected route.
    console.error("Chief AI routing threw unexpectedly", error);
    return res.status(500).json({ error: "Chief AI routing failed" });
  }
}

async function handleTranscribe(req: VercelRequest, res: VercelResponse) {
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

async function handleSpeak(req: VercelRequest, res: VercelResponse) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  const route = req.query.route;
  const routeName = Array.isArray(route) ? route[0] : route;

  switch (routeName) {
    case "transcribe":
      return handleTranscribe(req, res);
    case "speak":
      return handleSpeak(req, res);
    default:
      return handleAsk(req, res);
  }
}
