import { existsSync } from "node:fs";
import { join } from "node:path";

export type RepoHygieneReadinessStatus = "ready" | "partial" | "blocked" | "not_wired";

export interface RepoHygieneSummary {
  ciWorkflowPresent: boolean;
  inAppSignalsWired: boolean;
  githubWebhookConfigured: boolean;
  status: RepoHygieneReadinessStatus;
  summary: string;
  notes: string[];
}

/**
 * Honest repo hygiene baseline derived from repo files and env — no GitHub API calls.
 */
export function buildRepoHygieneSummary(root = process.cwd()): RepoHygieneSummary {
  const ciWorkflowPresent = existsSync(join(root, ".github/workflows/ci.yml"));
  const inAppSignalsWired = existsSync(join(root, "lib/ops/repoHealthSignals.ts"));
  const githubWebhookConfigured = Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim());

  const notes: string[] = [];

  if (ciWorkflowPresent) {
    notes.push("GitHub Actions CI workflow is present (npm test + build on push/PR).");
  } else {
    notes.push("GitHub Actions CI workflow file is missing.");
  }

  if (!inAppSignalsWired) {
    notes.push("In-app repo health / CI aggregation is not wired in V1.");
  }

  notes.push("Daily Build Health Check remains a manual runbook process.");

  if (githubWebhookConfigured) {
    notes.push("GITHUB_WEBHOOK_SECRET is set for gate automation webhook.");
  }

  const status: RepoHygieneReadinessStatus = !ciWorkflowPresent
    ? "blocked"
    : inAppSignalsWired
      ? "ready"
      : "partial";

  return {
    ciWorkflowPresent,
    inAppSignalsWired,
    githubWebhookConfigured,
    status,
    summary: ciWorkflowPresent
      ? "CI exists; product repo-health signals remain manual-only in V1."
      : "CI workflow missing from repo.",
    notes,
  };
}
