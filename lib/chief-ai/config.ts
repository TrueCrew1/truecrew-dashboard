/**
 * Feature-flag and provider-config precedence for Chief's AI fallback path.
 *
 * Precedence, checked in this order:
 * 1. CHIEF_AI_FALLBACK_ENABLED !== "true" -> deterministic only, nothing below matters.
 * 2. CHIEF_AI_LOCAL_ONLY_MODE === "true" -> skip the Azure tier entirely, Ollama only.
 * 3. Otherwise: Azure tier (only models with complete env config are attempted), then Ollama.
 * Per-provider: a provider with incomplete config is skipped, not treated as an error.
 */

export function isChiefAiFallbackEnabled(): boolean {
  return process.env.CHIEF_AI_FALLBACK_ENABLED === "true";
}

export function isChiefAiLocalOnly(): boolean {
  return process.env.CHIEF_AI_LOCAL_ONLY_MODE === "true";
}

export function isChiefVoiceEnabled(): boolean {
  return process.env.CHIEF_VOICE_ENABLED === "true";
}

export interface AzureModelConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
}

/** Returns null (skip this provider) unless endpoint, key, and deployment are all set. */
export function getAzureModelConfig(deploymentEnvVar: string): AzureModelConfig | null {
  const endpoint = process.env.AZURE_AI_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_AI_API_KEY?.trim();
  const deployment = process.env[deploymentEnvVar]?.trim();
  if (!endpoint || !apiKey || !deployment) return null;
  return { endpoint, apiKey, deployment };
}

export function getOllamaHost(): string {
  return process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";
}

export function getOllamaChiefModel(envVar: string, fallback: string): string {
  return process.env[envVar]?.trim() || fallback;
}

export interface AzureSpeechConfig {
  key: string;
  region: string;
}

export function getAzureSpeechConfig(): AzureSpeechConfig | null {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  if (!key || !region) return null;
  return { key, region };
}
