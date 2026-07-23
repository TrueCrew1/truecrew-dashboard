/**
 * Gated GitHub PR comment post — call only after explicit Chief approval.
 * Validates the target repo is in the selected project's allowed repo list.
 * Does not merge, close, or otherwise mutate PRs.
 */
export class GithubScopeCommentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubScopeCommentError";
  }
}

function parseRepo(repo: string): { owner: string; name: string } | null {
  const parts = repo.trim().split("/").filter(Boolean);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], name: parts[1] };
}

function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim() || undefined;
}

export type PostPullRequestCommentResult =
  | { ok: true; commentUrl: string; commentId: number }
  | { ok: false; error: string };

/**
 * Post a single issue/PR comment when `repo` is in `allowedRepos`.
 * Requires GITHUB_TOKEN or GH_TOKEN — anonymous posts are rejected.
 */
export async function postScopedPullRequestComment(input: {
  repo: string;
  prNumber: number;
  body: string;
  allowedRepos: readonly string[];
  fetchImpl?: typeof fetch;
}): Promise<PostPullRequestCommentResult> {
  const normalizedRepo = input.repo.trim();
  if (!input.allowedRepos.some((repo) => repo.trim() === normalizedRepo)) {
    return {
      ok: false,
      error: `Refusing to comment outside project GitHub scope: ${normalizedRepo}`,
    };
  }

  const parsed = parseRepo(normalizedRepo);
  if (!parsed) {
    return { ok: false, error: `Invalid GitHub repo: ${normalizedRepo}` };
  }

  if (!Number.isInteger(input.prNumber) || input.prNumber <= 0) {
    return { ok: false, error: "Invalid pull request number" };
  }

  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Comment body is empty" };
  }

  const token = githubToken();
  if (!token) {
    return {
      ok: false,
      error: "GITHUB_TOKEN or GH_TOKEN is required to post PR comments",
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const url = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}/issues/${input.prNumber}/comments`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "truecrew-dashboard-chief",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ body }),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "GitHub comment request failed",
    };
  }

  const payload = (await response.json().catch(() => null)) as {
    message?: string;
    html_url?: string;
    id?: number;
  } | null;

  if (!response.ok) {
    return {
      ok: false,
      error: payload?.message ?? `GitHub returned ${response.status} posting comment`,
    };
  }

  return {
    ok: true,
    commentUrl: typeof payload?.html_url === "string" ? payload.html_url : "",
    commentId: typeof payload?.id === "number" ? payload.id : 0,
  };
}
