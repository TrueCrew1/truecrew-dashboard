import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";

/**
 * Voice-prep scaffold — NOT IMPLEMENTED.
 *
 * Intended path: speech-in -> transcription (this route) -> Chief routing
 * (resolveChiefCommand / lib/chief/modelRouter.ts) -> text response ->
 * TTS (see speak.ts). Today, speech input is handled entirely client-side by
 * the browser's native Web Speech API (src/components/chief/useChiefVoice.ts)
 * — this route exists so a future server-side transcription provider (for
 * browsers/clients without Web Speech support, or higher-accuracy needs) has
 * a defined contract to fill in, without committing to a vendor yet.
 *
 * TODO (not scoped/decided): pick a transcription provider, add its env vars
 * following the AZURE_AI_ / OLLAMA_ prefixed-var pattern used elsewhere,
 * accept an audio payload here, return { transcript: string }.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  return res.status(501).json({
    error: "Not implemented",
    message:
      "Server-side transcription is a documented scaffold, not a live feature. " +
      "Voice input today goes through the browser's Web Speech API (useChiefVoice.ts).",
  });
}
