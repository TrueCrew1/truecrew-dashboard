import { GATE_KEYS } from "../gates/keys";
import {
  failGateForTasks,
  findTasksByHeadSha,
  findTasksForPullRequest,
  passGateForTasks,
  writeAuditEvent,
} from "../supabase/admin";
import {
  extractLinkedIssueNumbers,
  type GithubCheckRunPayload,
  type GithubCheckSuitePayload,
  type GithubPullRequestPayload,
} from "./verify";

export interface WebhookResult {
  handled: boolean;
  message: string;
  updatedGates?: string[];
}

export async function handlePullRequestEvent(
  payload: GithubPullRequestPayload,
): Promise<WebhookResult> {
  const repo = payload.repository.full_name;
  const pr = payload.pull_request;
  const linkedIssues = extractLinkedIssueNumbers(`${pr.title}\n${pr.body ?? ""}`);

  const taskIds = await findTasksForPullRequest({
    repo,
    prNumber: pr.number,
    headSha: pr.head.sha,
    linkedIssueNumbers: linkedIssues,
  });

  if (taskIds.length === 0) {
    return { handled: true, message: "No linked tasks found for pull request" };
  }

  const updatedGates: string[] = [];

  if (["opened", "reopened", "synchronize", "ready_for_review"].includes(payload.action)) {
    const count = await passGateForTasks(taskIds, GATE_KEYS.PR_OPENED);
    if (count > 0) updatedGates.push(GATE_KEYS.PR_OPENED);
  }

  if (payload.action === "closed" && !pr.merged) {
    const count = await failGateForTasks(taskIds, GATE_KEYS.PR_OPENED);
    if (count > 0) updatedGates.push(`${GATE_KEYS.PR_OPENED}:failed`);
  }

  await writeAuditEvent("task", taskIds[0], "github.pull_request", {
    repo,
    action: payload.action,
    prNumber: pr.number,
    taskIds,
    updatedGates,
  });

  return {
    handled: true,
    message: `Processed pull_request.${payload.action} for ${taskIds.length} task(s)`,
    updatedGates,
  };
}

export async function handleCheckConclusion(
  repo: string,
  headSha: string,
  conclusion: string | null,
  eventName: "check_run" | "check_suite",
): Promise<WebhookResult> {
  const taskIds = await findTasksByHeadSha(repo, headSha);

  if (taskIds.length === 0) {
    return { handled: true, message: `No linked tasks for ${eventName} head SHA` };
  }

  const updatedGates: string[] = [];

  if (conclusion === "success") {
    const count = await passGateForTasks(taskIds, GATE_KEYS.CI_GREEN);
    if (count > 0) updatedGates.push(GATE_KEYS.CI_GREEN);
  } else if (conclusion && conclusion !== "skipped" && conclusion !== "neutral") {
    const count = await failGateForTasks(taskIds, GATE_KEYS.CI_GREEN);
    if (count > 0) updatedGates.push(`${GATE_KEYS.CI_GREEN}:failed`);
  }

  await writeAuditEvent("task", taskIds[0], `github.${eventName}`, {
    repo,
    headSha,
    conclusion,
    taskIds,
    updatedGates,
  });

  return {
    handled: true,
    message: `Processed ${eventName} conclusion=${conclusion ?? "pending"}`,
    updatedGates,
  };
}

export async function handleCheckRunEvent(payload: GithubCheckRunPayload): Promise<WebhookResult> {
  if (payload.action !== "completed") {
    return { handled: true, message: "Ignoring non-completed check_run" };
  }

  return handleCheckConclusion(
    payload.repository.full_name,
    payload.check_run.head_sha,
    payload.check_run.conclusion,
    "check_run",
  );
}

export async function handleCheckSuiteEvent(
  payload: GithubCheckSuitePayload,
): Promise<WebhookResult> {
  if (payload.action !== "completed") {
    return { handled: true, message: "Ignoring non-completed check_suite" };
  }

  return handleCheckConclusion(
    payload.repository.full_name,
    payload.check_suite.head_sha,
    payload.check_suite.conclusion,
    "check_suite",
  );
}

export async function dispatchGithubEvent(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<WebhookResult> {
  switch (eventType) {
    case "pull_request":
      return handlePullRequestEvent(payload as unknown as GithubPullRequestPayload);
    case "check_run":
      return handleCheckRunEvent(payload as unknown as GithubCheckRunPayload);
    case "check_suite":
      return handleCheckSuiteEvent(payload as unknown as GithubCheckSuitePayload);
    default:
      return { handled: false, message: `Unsupported event type: ${eventType}` };
  }
}
