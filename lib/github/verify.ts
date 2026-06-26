import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGithubSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

export function extractLinkedIssueNumbers(text: string): number[] {
  const matches = text.matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi);
  const numbers = new Set<number>();
  for (const match of matches) {
    numbers.add(Number(match[1]));
  }
  return [...numbers];
}

export interface GithubPullRequestPayload {
  action: string;
  number: number;
  pull_request: {
    number: number;
    state: string;
    merged: boolean;
    head: { sha: string };
    body: string | null;
    title: string;
  };
  repository: { full_name: string };
}

export interface GithubCheckRunPayload {
  action: string;
  check_run: {
    status: string;
    conclusion: string | null;
    head_sha: string;
    pull_requests?: { number: number }[];
  };
  repository: { full_name: string };
}

export interface GithubCheckSuitePayload {
  action: string;
  check_suite: {
    status: string;
    conclusion: string | null;
    head_sha: string;
    pull_requests?: { number: number }[];
  };
  repository: { full_name: string };
}
