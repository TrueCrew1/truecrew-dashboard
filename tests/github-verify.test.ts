import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  extractLinkedIssueNumbers,
  verifyGithubSignature,
} from "../lib/github/verify.js";

function sign(payload: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

describe("verifyGithubSignature", () => {
  const secret = "webhook-secret";
  const payload = JSON.stringify({ action: "opened" });

  it("accepts a correctly signed payload", () => {
    expect(verifyGithubSignature(payload, sign(payload, secret), secret)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    expect(verifyGithubSignature(payload, sign(payload, "other"), secret)).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const header = sign(payload, secret);
    expect(verifyGithubSignature(payload + "x", header, secret)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyGithubSignature(payload, null, secret)).toBe(false);
  });

  it("rejects a header without the sha256= prefix", () => {
    const digest = createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyGithubSignature(payload, digest, secret)).toBe(false);
  });

  it("rejects a malformed digest of the wrong length", () => {
    expect(verifyGithubSignature(payload, "sha256=deadbeef", secret)).toBe(false);
  });
});

describe("extractLinkedIssueNumbers", () => {
  it("extracts issue numbers from closing keywords", () => {
    const text = "This fixes #12 and closes #34.";
    expect(extractLinkedIssueNumbers(text).sort((a, b) => a - b)).toEqual([12, 34]);
  });

  it("is case-insensitive and supports keyword variants", () => {
    expect(extractLinkedIssueNumbers("Resolved #7")).toEqual([7]);
    expect(extractLinkedIssueNumbers("FIX #9")).toEqual([9]);
  });

  it("de-duplicates repeated references", () => {
    expect(extractLinkedIssueNumbers("closes #5 and fixes #5")).toEqual([5]);
  });

  it("ignores bare issue references without a keyword", () => {
    expect(extractLinkedIssueNumbers("see #100 for context")).toEqual([]);
  });

  it("returns an empty array when there are no matches", () => {
    expect(extractLinkedIssueNumbers("no issues here")).toEqual([]);
  });
});
