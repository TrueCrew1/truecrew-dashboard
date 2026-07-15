import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeChiefAiRequest } from "./router.js";

const ENV_KEYS = [
  "CHIEF_AI_FALLBACK_ENABLED",
  "CHIEF_AI_LOCAL_ONLY_MODE",
  "AZURE_AI_ENDPOINT",
  "AZURE_AI_API_KEY",
  "AZURE_GPT5_MINI_DEPLOYMENT",
  "AZURE_DEEPSEEK_V4_PRO_DEPLOYMENT",
  "AZURE_KIMI_K26_DEPLOYMENT",
  "OLLAMA_HOST",
  "OLLAMA_CHIEF_MODEL_PRIMARY",
  "OLLAMA_CHIEF_MODEL_SECONDARY",
] as const;

const originalEnv: Record<string, string | undefined> = {};

function azureChatResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

describe("routeChiefAiRequest", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("stays deterministic when CHIEF_AI_FALLBACK_ENABLED is not set (default)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await routeChiefAiRequest({
      query: "what is at risk?",
      deterministicSummary: "3 open tasks.",
    });

    expect(result.route).toBe("deterministic");
    expect(result.degraded).toBe(false);
    expect(result.summary).toBe("3 open tasks.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("tries Azure GPT-5 mini first when fully configured and enabled, and stops there on success", async () => {
    process.env.CHIEF_AI_FALLBACK_ENABLED = "true";
    process.env.AZURE_AI_ENDPOINT = "https://example.services.ai.azure.com";
    process.env.AZURE_AI_API_KEY = "test-key";
    process.env.AZURE_GPT5_MINI_DEPLOYMENT = "gpt-5-mini";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      azureChatResponse("Deploy is blocked on gate X.") as unknown as Response,
    );

    const result = await routeChiefAiRequest({ query: "what's blocked?" });

    expect(result.route).toBe("azure_gpt5_mini");
    expect(result.degraded).toBe(false);
    expect(result.summary).toBe("Deploy is blocked on gate X.");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("gpt-5-mini");
  });

  it("skips an unconfigured Azure model and falls through to the next configured tier", async () => {
    process.env.CHIEF_AI_FALLBACK_ENABLED = "true";
    // GPT-5 mini deliberately left unconfigured — no AZURE_GPT5_MINI_DEPLOYMENT.
    process.env.AZURE_AI_ENDPOINT = "https://example.services.ai.azure.com";
    process.env.AZURE_AI_API_KEY = "test-key";
    process.env.AZURE_DEEPSEEK_V4_PRO_DEPLOYMENT = "deepseek-v4-pro";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      azureChatResponse("DeepSeek answered instead.") as unknown as Response,
    );

    const result = await routeChiefAiRequest({ query: "what's blocked?" });

    expect(result.route).toBe("azure_deepseek_v4_pro");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("moves to the next tier when a configured provider errors, and logs the failure", async () => {
    process.env.CHIEF_AI_FALLBACK_ENABLED = "true";
    process.env.AZURE_AI_ENDPOINT = "https://example.services.ai.azure.com";
    process.env.AZURE_AI_API_KEY = "test-key";
    process.env.AZURE_GPT5_MINI_DEPLOYMENT = "gpt-5-mini";
    process.env.AZURE_DEEPSEEK_V4_PRO_DEPLOYMENT = "deepseek-v4-pro";

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response)
      .mockResolvedValueOnce(
        azureChatResponse("DeepSeek recovered from GPT-5 mini's failure.") as unknown as Response,
      );

    const result = await routeChiefAiRequest({ query: "what's blocked?" });

    expect(result.route).toBe("azure_deepseek_v4_pro");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("skips the whole Azure tier in local-only mode, even if Azure is fully configured", async () => {
    process.env.CHIEF_AI_FALLBACK_ENABLED = "true";
    process.env.CHIEF_AI_LOCAL_ONLY_MODE = "true";
    process.env.AZURE_AI_ENDPOINT = "https://example.services.ai.azure.com";
    process.env.AZURE_AI_API_KEY = "test-key";
    process.env.AZURE_GPT5_MINI_DEPLOYMENT = "gpt-5-mini";
    process.env.OLLAMA_HOST = "http://ollama.test";

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ response: "Local model answered." }),
    } as unknown as Response);

    const result = await routeChiefAiRequest({ query: "what's blocked?" });

    expect(result.route).toBe("ollama_llama3");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("ollama.test");
  });

  it("falls all the way through to the canned fallback when every provider fails", async () => {
    process.env.CHIEF_AI_FALLBACK_ENABLED = "true";
    process.env.AZURE_AI_ENDPOINT = "https://example.services.ai.azure.com";
    process.env.AZURE_AI_API_KEY = "test-key";
    process.env.AZURE_GPT5_MINI_DEPLOYMENT = "gpt-5-mini";
    process.env.OLLAMA_HOST = "http://ollama.test";

    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network unreachable"));

    const result = await routeChiefAiRequest({
      query: "what's blocked?",
      deterministicSummary: "Deterministic fallback text.",
    });

    expect(result.route).toBe("canned_fallback");
    expect(result.degraded).toBe(true);
    expect(result.summary).toBe("Deterministic fallback text.");
  });
});
