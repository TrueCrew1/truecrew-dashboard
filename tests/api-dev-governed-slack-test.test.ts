import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAuthMock, governedLoopSlackMock } = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  governedLoopSlackMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  requireInternalAuth: requireInternalAuthMock,
}));

vi.mock("../lib/governedLoopSlack.js", () => ({
  governedLoopSlack: governedLoopSlackMock,
}));

import handler from "../api/dev/governed-slack-test.js";

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("POST /api/dev/governed-slack-test", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAuthMock.mockReturnValue(true);
    governedLoopSlackMock.mockResolvedValue(undefined);
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("sends the dev test Slack message in non-production", async () => {
    const req = { method: "POST" } as VercelRequest;
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(governedLoopSlackMock).toHaveBeenCalledWith(
      "Chief governance test: Slack wiring is live.",
    );
  });

  it("returns 404 in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";

    const req = { method: "POST" } as VercelRequest;
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(404);
    expect(governedLoopSlackMock).not.toHaveBeenCalled();
  });
});
