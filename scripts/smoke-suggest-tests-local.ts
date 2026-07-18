#!/usr/bin/env npx tsx
/** Local smoke test for POST /api/llm/suggest-tests (uses .env.local). */
import "./load-llm-env.js";
import handler from "../api/llm/suggest-tests.ts";

async function main(): Promise<void> {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    console.error("INTERNAL_API_SECRET missing from .env.local");
    process.exit(1);
  }

  const unauthReq = {
    method: "POST",
    headers: {},
    body: { title: "Docs-only change", summary: "README update for approval loop test" },
  };
  const unauthRes = makeRes();
  await handler(unauthReq as never, unauthRes as never);
  console.log(`unauthenticated: ${unauthRes.statusCode}`);

  const authReq = {
    method: "POST",
    headers: { "x-internal-key": secret },
    body: { title: "Docs-only change", summary: "README update for approval loop test" },
  };
  const authRes = makeRes();
  await handler(authReq as never, authRes as never);
  console.log(`authenticated: ${authRes.statusCode}`);
  if (authRes.body) {
    console.log(`has_suggestions: ${Array.isArray(authRes.body.suggestions)}`);
    console.log(`advisory_only: ${authRes.body.advisoryOnly === true}`);
  }
}

function makeRes() {
  return {
    statusCode: 0,
    body: null as Record<string, unknown> | null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(body: Record<string, unknown>) {
      this.body = body;
    },
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
