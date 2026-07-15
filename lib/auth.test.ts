import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "./auth.js";

function makeReq(headerValue?: string | string[]): VercelRequest {
  return {
    headers: headerValue === undefined ? {} : { "x-internal-key": headerValue },
  } as unknown as VercelRequest;
}

function makeRes(): VercelResponse & { statusCode?: number; body?: unknown } {
  const res: Partial<VercelResponse> & { statusCode?: number; body?: unknown } = {};
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as VercelResponse;
  });
  res.json = vi.fn((payload: unknown) => {
    res.body = payload;
    return res as VercelResponse;
  });
  return res as VercelResponse & { statusCode?: number; body?: unknown };
}

describe("requireInternalAuth", () => {
  const ORIGINAL_SECRET = process.env.INTERNAL_API_SECRET;

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = "test-secret-value";
  });

  afterEach(() => {
    process.env.INTERNAL_API_SECRET = ORIGINAL_SECRET;
  });

  it("fails closed with 401 when INTERNAL_API_SECRET is not configured", () => {
    delete process.env.INTERNAL_API_SECRET;
    const req = makeReq("anything");
    const res = makeRes();

    expect(requireInternalAuth(req, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects a request with no x-internal-key header", () => {
    const req = makeReq(undefined);
    const res = makeRes();

    expect(requireInternalAuth(req, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rejects a request with a mismatched x-internal-key", () => {
    const req = makeReq("wrong-value");
    const res = makeRes();

    expect(requireInternalAuth(req, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("accepts a request with the matching x-internal-key", () => {
    const req = makeReq("test-secret-value");
    const res = makeRes();

    expect(requireInternalAuth(req, res)).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepts an array-valued header by using the first entry", () => {
    const req = makeReq(["test-secret-value", "extra"]);
    const res = makeRes();

    expect(requireInternalAuth(req, res)).toBe(true);
  });
});
