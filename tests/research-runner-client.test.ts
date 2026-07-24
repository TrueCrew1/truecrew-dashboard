import { describe, expect, it } from "vitest";
import {
  countByStatus,
  pickOldestInProgress,
  resolveResearchRunnerEnv,
  type RunnerResearchRequest,
} from "../lib/research/runnerClient";

function row(
  partial: Partial<RunnerResearchRequest> & Pick<RunnerResearchRequest, "id" | "status" | "updatedAt">,
): RunnerResearchRequest {
  return {
    topic: "Topic",
    whyItMatters: "Why",
    suggestedOutcome: "Outcome",
    createdAt: "2026-07-22T12:00:00.000Z",
    source: "adapter",
    ...partial,
  };
}

describe("research runner client", () => {
  it("resolveResearchRunnerEnv fails closed with missing names listed", () => {
    const result = resolveResearchRunnerEnv({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(["TRUECREW_API_URL", "TRUECREW_INTERNAL_KEY"]);
    expect(result.error).toMatch(/TRUECREW_API_URL/);
  });

  it("resolveResearchRunnerEnv strips trailing slash from API URL", () => {
    const result = resolveResearchRunnerEnv({
      TRUECREW_API_URL: "https://example.vercel.app/",
      TRUECREW_INTERNAL_KEY: "secret",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.env.apiUrl).toBe("https://example.vercel.app");
    expect(result.env.internalKey).toBe("secret");
  });

  it("pickOldestInProgress returns the earliest updated in_progress row", () => {
    const requests = [
      row({ id: "a", status: "queued", updatedAt: "2026-07-22T10:00:00.000Z" }),
      row({ id: "b", status: "in_progress", updatedAt: "2026-07-22T12:00:00.000Z" }),
      row({ id: "c", status: "in_progress", updatedAt: "2026-07-22T11:00:00.000Z" }),
      row({ id: "d", status: "done", updatedAt: "2026-07-22T09:00:00.000Z" }),
    ];
    expect(pickOldestInProgress(requests)?.id).toBe("c");
  });

  it("pickOldestInProgress returns null when nothing is released", () => {
    expect(
      pickOldestInProgress([
        row({ id: "a", status: "queued", updatedAt: "2026-07-22T10:00:00.000Z" }),
      ]),
    ).toBeNull();
  });

  it("countByStatus tallies the four statuses", () => {
    expect(
      countByStatus([
        row({ id: "1", status: "queued", updatedAt: "2026-07-22T10:00:00.000Z" }),
        row({ id: "2", status: "in_progress", updatedAt: "2026-07-22T10:00:00.000Z" }),
        row({ id: "3", status: "in_progress", updatedAt: "2026-07-22T10:00:00.000Z" }),
        row({ id: "4", status: "blocked", updatedAt: "2026-07-22T10:00:00.000Z" }),
      ]),
    ).toEqual({ queued: 1, in_progress: 2, done: 0, blocked: 1 });
  });
});
