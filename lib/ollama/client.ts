export type OllamaModel = "llama3" | "deepseek-r1";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const MODEL_ENV_VAR: Record<OllamaModel, string> = {
  llama3: "OLLAMA_MODEL_LLAMA3",
  "deepseek-r1": "OLLAMA_MODEL_DEEPSEEK_R1",
};

const MODEL_TAG_DEFAULT: Record<OllamaModel, string> = {
  llama3: "llama3",
  "deepseek-r1": "deepseek-r1",
};

interface OllamaChatResponse {
  message?: { content?: string };
}

/** Fails closed: every error path throws OllamaError rather than swallowing it. */
export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaError";
  }
}

function resolveHost(): string {
  return process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";
}

function resolveModelTag(model: OllamaModel): string {
  return process.env[MODEL_ENV_VAR[model]]?.trim() || MODEL_TAG_DEFAULT[model];
}

/**
 * Calls a local Ollama chat deployment directly via fetch (no SDK dependency,
 * matching lib/azureAi/client.ts and lib/librarian/refine.ai.ts's pattern).
 * Only reachable when the caller's process runs on the same machine as
 * Ollama (local dev) — not reachable from a deployed Vercel function.
 */
export async function askOllama(
  model: OllamaModel,
  messages: OllamaMessage[],
): Promise<string> {
  const host = resolveHost();
  const tag = resolveModelTag(model);

  let response: Response;
  try {
    response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: tag, messages, stream: false }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    throw new OllamaError(
      `Ollama unreachable at ${host}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  if (!response.ok) {
    throw new OllamaError(`Ollama returned ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as OllamaChatResponse;
  const content = body.message?.content;
  if (!content) {
    throw new OllamaError("Ollama response missing message content");
  }
  return content;
}

/**
 * Best-effort reachability probe — used to skip the Ollama tier fast rather
 * than waiting out a full request timeout when it's simply not running.
 */
export async function isOllamaReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${resolveHost()}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}
