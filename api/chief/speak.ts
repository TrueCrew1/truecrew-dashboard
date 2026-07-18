import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";

/**
 * Voice-prep scaffold — NOT IMPLEMENTED.
 *
 * Intended path: speech-in -> transcription (see transcribe.ts) -> Chief
 * routing -> text response -> TTS (this route). Today, spoken responses are
 * handled entirely client-side by the browser's native SpeechSynthesis API
 * (src/components/chief/useChiefVoice.ts, the "Speak" button on a response
 * card) — this route exists so a future server-side TTS provider (for
 * higher-quality voices or clients without SpeechSynthesis) has a defined
 * contract to fill in, without committing to a vendor yet.
 *
 * TODO (not scoped/decided): pick a TTS provider, add its env vars following
 * the AZURE_AI_ / OLLAMA_ prefixed-var pattern used elsewhere, accept
 * { text: string } here, return synthesized audio.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  return res.status(501).json({
    error: "Not implemented",
    message:
      "Server-side text-to-speech is a documented scaffold, not a live feature. " +
      "Spoken responses today go through the browser's SpeechSynthesis API (useChiefVoice.ts).",
  });
}
