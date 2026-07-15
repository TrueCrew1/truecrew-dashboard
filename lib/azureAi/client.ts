export type AzureAiDeployment = "deepseek-v4-pro" | "gpt-5-mini" | "kimi-k2-6";

const DEPLOYMENT_ENV_VAR: Record<AzureAiDeployment, string> = {
  "deepseek-v4-pro": "AZURE_AI_DEPLOYMENT_DEEPSEEK_V4_PRO",
  "gpt-5-mini": "AZURE_AI_DEPLOYMENT_GPT5_MINI",
  "kimi-k2-6": "AZURE_AI_DEPLOYMENT_KIMI_K2_6",
};

export interface AzureAiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AzureAiChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** True when endpoint, key, and the requested deployment are all configured. */
export function isAzureAiConfigured(deployment: AzureAiDeployment): boolean {
  return (
    Boolean(process.env.AZURE_AI_ENDPOINT?.trim()) &&
    Boolean(process.env.AZURE_AI_KEY?.trim()) &&
    Boolean(process.env[DEPLOYMENT_ENV_VAR[deployment]]?.trim())
  );
}

/**
 * Calls an Azure AI Foundry chat completions deployment directly via fetch
 * (no SDK dependency, matching lib/librarian/refine.ai.ts's Ollama pattern).
 * Auth is a bearer key, not Azure AD — verified against the live endpoint.
 */
export async function askAzureAi(
  deployment: AzureAiDeployment,
  messages: AzureAiChatMessage[],
): Promise<string> {
  const endpoint = process.env.AZURE_AI_ENDPOINT?.trim();
  const key = process.env.AZURE_AI_KEY?.trim();
  const model = process.env[DEPLOYMENT_ENV_VAR[deployment]]?.trim();

  if (!endpoint || !key || !model) {
    throw new Error(`Azure AI deployment "${deployment}" is not configured`);
  }

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Azure AI returned ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as AzureAiChatCompletionResponse;
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Azure AI response missing message content");
  }
  return content;
}
