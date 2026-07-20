import { describe, expect, it } from "vitest";
import {
  ApiUnavailableError,
  formatApiErrorForUi,
  humanizeNonJsonApiFailure,
  isLikelyNonJsonBody,
  readResponseJson,
} from "@/lib/api/safeJson";

describe("safeJson helpers", () => {
  it("detects HTML and TS-module bodies as non-JSON", () => {
    expect(isLikelyNonJsonBody("<!doctype html><html>", "text/html")).toBe(true);
    expect(isLikelyNonJsonBody('import { r } from "./x"', "application/javascript")).toBe(true);
    expect(isLikelyNonJsonBody('{"ok":true}', "application/json")).toBe(false);
  });

  it("parses valid JSON responses", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
    await expect(readResponseJson<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
  });

  it("throws ApiUnavailableError for HTML without Unexpected token text", async () => {
    const response = new Response("<!doctype html><html></html>", {
      headers: { "content-type": "text/html" },
    });

    await expect(readResponseJson(response, { pathHint: "/api/chief/approval-activity" })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiUnavailableError &&
        !/Unexpected token/i.test(err.message) &&
        /dev mode|non-JSON/i.test(err.message),
    );
  });

  it("throws ApiUnavailableError for TS-looking module bodies", async () => {
    const response = new Response('import { r } from "./monitor"', {
      headers: { "content-type": "application/javascript" },
    });

    await expect(readResponseJson(response, { pathHint: "/api/monitor" })).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
  });

  it("humanizes raw JSON parse errors for UI", () => {
    expect(formatApiErrorForUi(new Error("Unexpected token '<' ... is not valid JSON"), "fallback")).toMatch(
      /dev mode|non-JSON/i,
    );
    expect(formatApiErrorForUi(new ApiUnavailableError(humanizeNonJsonApiFailure()), "fallback")).toMatch(
      /dev mode|non-JSON/i,
    );
  });
});
