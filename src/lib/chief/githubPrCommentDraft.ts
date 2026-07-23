/**
 * Build a single project-scoped GitHub PR comment draft (no post).
 */
import type { ProjectToolScope } from "@/data/projects";
import type { GithubPullRequestSummary } from "@/lib/api/client";

export interface GithubPrCommentDraft {
  projectId: string;
  projectName: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  body: string;
  preview: string;
}

export function extractGithubCommentTopic(command: string): string {
  const cleaned = command
    .replace(/\b(draft|propose|prepare|post|create|new)\b/gi, " ")
    .replace(/\b(github|pr|pull\s*requests?|comment|comments|on|for|this|project|about|a|an|the)\b/gi, " ")
    .replace(/#\d+/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Chief project review note";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function parsePrNumberFromCommand(command: string): number | null {
  const hash = command.match(/#(\d+)\b/);
  if (hash) return Number(hash[1]);
  const labeled = command.match(/\b(?:pr|pull\s*request)\s*#?\s*(\d+)\b/i);
  if (labeled) return Number(labeled[1]);
  return null;
}

export function previewGithubCommentBody(body: string, max = 280): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function buildGithubPrCommentBody(input: {
  topic: string;
  projectName: string;
  command: string;
  pr: GithubPullRequestSummary;
}): string {
  return [
    `### ${input.topic}`,
    "",
    `_Draft from Chief for **${input.projectName}** on ${input.pr.repo}#${input.pr.number}._`,
    "",
    input.command.trim(),
    "",
    "—",
    "*Posted after operator approval. Read-only draft until then.*",
    "",
  ].join("\n");
}

/** Pick one in-scope open PR: explicit number from command, else most recently listed. */
export function selectGithubPrForCommentDraft(
  pullRequests: readonly GithubPullRequestSummary[],
  command: string,
): GithubPullRequestSummary | null {
  if (pullRequests.length === 0) return null;
  const wanted = parsePrNumberFromCommand(command);
  if (wanted !== null) {
    return pullRequests.find((pr) => pr.number === wanted) ?? null;
  }
  return pullRequests[0] ?? null;
}

export function buildGithubPrCommentDraft(input: {
  scope: ProjectToolScope;
  command: string;
  pullRequest: GithubPullRequestSummary;
}): GithubPrCommentDraft | null {
  if (!input.scope.githubRepos.includes(input.pullRequest.repo)) {
    return null;
  }

  const topic = extractGithubCommentTopic(input.command);
  const body = buildGithubPrCommentBody({
    topic,
    projectName: input.scope.projectName,
    command: input.command,
    pr: input.pullRequest,
  });

  return {
    projectId: input.scope.projectId,
    projectName: input.scope.projectName,
    repo: input.pullRequest.repo,
    prNumber: input.pullRequest.number,
    prTitle: input.pullRequest.title,
    prUrl: input.pullRequest.url,
    body,
    preview: previewGithubCommentBody(body),
  };
}

export function isGithubRepoInScope(repo: string, allowedRepos: readonly string[]): boolean {
  return allowedRepos.some((allowed) => allowed.trim() === repo.trim());
}
