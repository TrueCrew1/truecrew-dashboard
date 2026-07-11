import { afterEach, describe, expect, it, vi } from "vitest";
import { internalApiHeaders } from "@/lib/api/librarianRuntime";

describe("internalApiHeaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns no headers when VITE_INTERNAL_KEY is unset", () => {
    vi.stubEnv("VITE_INTERNAL_KEY", "");

    expect(internalApiHeaders()).toEqual({});
  });

  it("returns the x-internal-key header when VITE_INTERNAL_KEY is set", () => {
    vi.stubEnv("VITE_INTERNAL_KEY", "test-secret");

    expect(internalApiHeaders()).toEqual({ "x-internal-key": "test-secret" });
  });
});
