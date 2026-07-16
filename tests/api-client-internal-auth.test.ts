import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "../src/lib/api/client.js";

describe("apiFetch internal-auth header propagation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("attaches x-internal-key when VITE_INTERNAL_KEY is configured", async () => {
    vi.stubEnv("VITE_INTERNAL_KEY", "test-key-123");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, supabase: true, githubWebhook: true, host: "vercel" }),
    } as unknown as Response);

    await fetchHealth();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-internal-key"]).toBe("test-key-123");
  });

  it("sends no x-internal-key header and warns when live mode is on but the key is missing", async () => {
    vi.stubEnv("VITE_INTERNAL_KEY", "");
    vi.stubEnv("VITE_USE_LIVE_API", "true");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as unknown as Response);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await fetchHealth();

    const [, init] = fetchSpy.mock.calls[0];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["x-internal-key"]).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
