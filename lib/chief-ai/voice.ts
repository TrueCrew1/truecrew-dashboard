import { getAzureSpeechConfig } from "./config.js";

const MAX_TTS_CHARS = 1000;

interface AzureSttResponse {
  RecognitionStatus?: string;
  DisplayText?: string;
}

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Voice v1: file-upload speech-to-text via Azure AI Speech's short-audio REST
 * endpoint (no streaming/realtime). Throws with a clear message when
 * AZURE_SPEECH_KEY/AZURE_SPEECH_REGION aren't configured — callers fail
 * closed, they don't fabricate a transcript.
 */
export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const config = getAzureSpeechConfig();
  if (!config) {
    throw new Error("Voice transcription is not configured (AZURE_SPEECH_KEY/AZURE_SPEECH_REGION missing)");
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const url = `https://${config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.key,
      "Content-Type": mimeType || "audio/webm",
      Accept: "application/json",
    },
    body: audioBuffer,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Azure Speech transcription returned ${response.status}`);
  }

  const body = (await response.json()) as AzureSttResponse;
  if (body.RecognitionStatus !== "Success" || !body.DisplayText) {
    throw new Error(`Azure Speech transcription status: ${body.RecognitionStatus ?? "unknown"}`);
  }

  return body.DisplayText;
}

/**
 * Voice v1: text-to-speech via Azure AI Speech's REST endpoint. Same
 * fail-closed contract as transcribeAudio.
 */
export async function synthesizeSpeech(
  text: string,
): Promise<{ audioBase64: string; mimeType: string }> {
  const config = getAzureSpeechConfig();
  if (!config) {
    throw new Error("Voice synthesis is not configured (AZURE_SPEECH_KEY/AZURE_SPEECH_REGION missing)");
  }

  const trimmed = text.trim().slice(0, MAX_TTS_CHARS);
  if (!trimmed) {
    throw new Error("No text to synthesize");
  }

  const ssml = `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Male' name='en-US-GuyNeural'>${escapeSsml(trimmed)}</voice></speak>`;
  const url = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
    },
    body: ssml,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Azure Speech synthesis returned ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return { audioBase64: buffer.toString("base64"), mimeType: "audio/mpeg" };
}
