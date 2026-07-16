import { describe, expect, it } from "vitest";
import { GATE_KEYS, normalizeRepo, parseGithubRef } from "../lib/gates/keys.js";

describe("parseGithubRef", () => {
  it("parses a valid owner/repo#issue reference", () => {
    expect(parseGithubRef("TrueCrew1/truecrew-dashboard#42")).toEqual({
      repo: "TrueCrew1/truecrew-dashboard",
      issueNumber: 42,
    });
  });

  it("returns null for null/undefined/empty input", () => {
    expect(parseGithubRef(null)).toBeNull();
    expect(parseGithubRef(undefined)).toBeNull();
    expect(parseGithubRef("")).toBeNull();
  });

  it("returns null when there is no issue number", () => {
    expect(parseGithubRef("owner/repo")).toBeNull();
  });

  it("returns null when the issue number is non-numeric", () => {
    expect(parseGithubRef("owner/repo#abc")).toBeNull();
  });

  it("rejects a reference with more than one '#'", () => {
    expect(parseGithubRef("owner#repo#1")).toBeNull();
  });
});

describe("normalizeRepo", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeRepo("  owner/repo  ")).toBe("owner/repo");
  });

  it("leaves an already-clean name unchanged", () => {
    expect(normalizeRepo("owner/repo")).toBe("owner/repo");
  });
});

describe("GATE_KEYS", () => {
  it("exposes the stable gate key identifiers", () => {
    expect(GATE_KEYS.PR_OPENED).toBe("pr_opened");
    expect(GATE_KEYS.CI_GREEN).toBe("ci_green");
    expect(GATE_KEYS.PR_APPROVED).toBe("pr_approved");
  });
});
