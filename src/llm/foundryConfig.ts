/**
 * Resolve Azure AI Foundry base URL from env.
 * Accepts AZURE_AI_RESOURCE_ENDPOINT or derives from AZURE_OPENAI_ENDPOINT.
 */
export function resolveFoundryEndpoint(): string {
  const direct = process.env.AZURE_AI_RESOURCE_ENDPOINT?.trim();
  if (direct) return direct.replace(/\/$/, "");

  const classic = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  if (classic?.includes(".openai.azure.com")) {
    return classic.replace(".openai.azure.com", ".services.ai.azure.com").replace(/\/$/, "");
  }

  return "";
}
