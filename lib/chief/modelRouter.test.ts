import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyChiefFallbackQuery, routeChiefFallback } from "./modelRouter";

test("classifyChiefFallbackQuery: code/refactor keywords -> code", () => {
  assert.equal(classifyChiefFallbackQuery("Can you refactor this function?"), "code");
  assert.equal(classifyChiefFallbackQuery("There's a bug in the API schema migration"), "code");
});

test("classifyChiefFallbackQuery: reasoning/strategy keywords -> reasoning", () => {
  assert.equal(classifyChiefFallbackQuery("What's our architecture risk here?"), "reasoning");
  assert.equal(classifyChiefFallbackQuery("Help me decide on a strategy"), "reasoning");
});

test("classifyChiefFallbackQuery: unmatched query -> general", () => {
  assert.equal(classifyChiefFallbackQuery("How's the weather today?"), "general");
});

// Must be async and must `await fn()` (not just `return fn()`) — otherwise the
// finally block restores env vars synchronously, before an awaited fn() body
// reaches its post-await checks (e.g. the Ollama fallback check after a
// failed Azure call), reverting env state out from under it mid-flight.
async function withEnv<T>(
  vars: Record<string, string | undefined>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) previous[key] = process.env[key];
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withMockFetch<T>(
  impl: (url: string, init?: RequestInit) => Promise<Response>,
  fn: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  // @ts-expect-error test stub, narrower signature than the real fetch overload set
  globalThis.fetch = impl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

const jsonResponse = (body: unknown, ok = true) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));

test("routeChiefFallback: everything disabled returns null (canned generic wins)", async () => {
  const result = await withEnv(
    { CHIEF_AI_FALLBACK_ENABLED: "false", CHIEF_OLLAMA_FALLBACK_ENABLED: "false", CHIEF_LOCAL_ONLY_MODE: "false" },
    () => routeChiefFallback("what is at risk today?", ""),
  );
  assert.equal(result, null);
});

test("routeChiefFallback: local-only mode routes to Ollama and skips Azure", async () => {
  let calledOllama = false;
  await withEnv(
    {
      CHIEF_LOCAL_ONLY_MODE: "true",
      CHIEF_OLLAMA_FALLBACK_ENABLED: "true",
      CHIEF_AI_FALLBACK_ENABLED: "true", // deliberately also on, to prove local-only skips it
      OLLAMA_HOST: "http://127.0.0.1:11434",
    },
    () =>
      withMockFetch(
        (url) => {
          const href = String(url);
          if (href.endsWith("/api/tags")) return Promise.resolve(new Response("", { status: 200 }));
          if (href.endsWith("/api/chat")) {
            calledOllama = true;
            return jsonResponse({ message: { content: "local answer" } });
          }
          throw new Error(`Unexpected fetch to Azure from local-only mode: ${href}`);
        },
        async () => {
          const result = await routeChiefFallback("what is at risk today?", "");
          assert.equal(result?.source, "ollama");
          assert.equal(result?.summary, "local answer");
        },
      ),
  );
  assert.equal(calledOllama, true);
});

test("routeChiefFallback: Azure failure falls back to Ollama before canned generic", async () => {
  await withEnv(
    {
      CHIEF_AI_FALLBACK_ENABLED: "true",
      CHIEF_OLLAMA_FALLBACK_ENABLED: "true",
      CHIEF_LOCAL_ONLY_MODE: "false",
      AZURE_AI_ENDPOINT: "https://example.azure.test/openai/v1",
      AZURE_AI_KEY: "test-key",
      AZURE_AI_DEPLOYMENT_GPT5_MINI: "gpt-5-mini",
      OLLAMA_HOST: "http://127.0.0.1:11434",
    },
    () =>
      withMockFetch(
        (url) => {
          const href = String(url);
          if (href.includes("azure.test")) {
            return Promise.resolve(new Response("server error", { status: 500 }));
          }
          if (href.endsWith("/api/tags")) return Promise.resolve(new Response("", { status: 200 }));
          if (href.endsWith("/api/chat")) return jsonResponse({ message: { content: "fallback answer" } });
          throw new Error(`Unexpected fetch: ${href}`);
        },
        async () => {
          const result = await routeChiefFallback("how's the weather?", "");
          assert.equal(result?.source, "ollama");
          assert.equal(result?.summary, "fallback answer");
        },
      ),
  );
});

test("routeChiefFallback: lane defaults to 'chief' when omitted", async () => {
  await withEnv(
    {
      CHIEF_AI_FALLBACK_ENABLED: "true",
      CHIEF_OLLAMA_FALLBACK_ENABLED: "false",
      CHIEF_LOCAL_ONLY_MODE: "false",
      AZURE_AI_ENDPOINT: "https://example.azure.test/openai/v1",
      AZURE_AI_KEY: "test-key",
      AZURE_AI_DEPLOYMENT_GPT5_MINI: "gpt-5-mini",
    },
    () =>
      withMockFetch(
        () => jsonResponse({ choices: [{ message: { content: "hi" } }] }),
        async () => {
          const result = await routeChiefFallback("how's the weather?", "");
          assert.equal(result?.lane, "chief");
        },
      ),
  );
});

test("routeChiefFallback: passed lane is echoed on the result", async () => {
  await withEnv(
    {
      CHIEF_AI_FALLBACK_ENABLED: "true",
      CHIEF_OLLAMA_FALLBACK_ENABLED: "false",
      CHIEF_LOCAL_ONLY_MODE: "false",
      AZURE_AI_ENDPOINT: "https://example.azure.test/openai/v1",
      AZURE_AI_KEY: "test-key",
      AZURE_AI_DEPLOYMENT_GPT5_MINI: "gpt-5-mini",
    },
    () =>
      withMockFetch(
        () => jsonResponse({ choices: [{ message: { content: "hi" } }] }),
        async () => {
          const result = await routeChiefFallback("how's the weather?", "", { lane: "builder" });
          assert.equal(result?.lane, "builder");
        },
      ),
  );
});

test("routeChiefFallback: cloud tier picks Kimi for a code-shaped query", async () => {
  let requestedModel: string | undefined;
  await withEnv(
    {
      CHIEF_AI_FALLBACK_ENABLED: "true",
      CHIEF_OLLAMA_FALLBACK_ENABLED: "false",
      CHIEF_LOCAL_ONLY_MODE: "false",
      AZURE_AI_ENDPOINT: "https://example.azure.test/openai/v1",
      AZURE_AI_KEY: "test-key",
      AZURE_AI_DEPLOYMENT_KIMI_K2_6: "Kimi-K2.6",
    },
    () =>
      withMockFetch(
        (_url, init) => {
          requestedModel = JSON.parse(String(init?.body)).model;
          return jsonResponse({ choices: [{ message: { content: "kimi answer" } }] });
        },
        async () => {
          const result = await routeChiefFallback("please refactor this function", "");
          assert.equal(result?.source, "azure");
          assert.equal(result?.model, "kimi-k2-6");
        },
      ),
  );
  assert.equal(requestedModel, "Kimi-K2.6");
});
