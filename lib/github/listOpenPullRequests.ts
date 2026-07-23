/**
 * Read-only GitHub helper: list open PRs for owner/repo strings.
 * Used by Chief project-scoped tool reads — no merge/close.
 */
export interface GithubPullRequestSummary {
  repo: string;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
}

export type ListOpenPullRequestsResult =
  | { ok: true; pullRequests: GithubPullRequestSummary[]; authMode: "token" | "anonymous" }
  | { ok: false; error: string };

function parseRepo(repo: string): { owner: string; name: string } | null {
  const trimmed = repo.trim();
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  const [owner, name] = parts;
  if (!owner || !name) return null;
  return { owner, name };
}

function githubToken(): string | undefined {
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  return token || undefined;
}

/**
 * Lists open pull requests for each `owner/repo` (read-only).
 * Uses GITHUB_TOKEN / GH_TOKEN when set; otherwise anonymous public API.
 */
export async function listOpenPullRequestsForRepos(
  repos: readonly string[],
  options: { fetchImpl?: typeof fetch; perRepoLimit?: number } = {},
): Promise<ListOpenPullRequestsResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const perRepoLimit = options.perRepoLimit ?? 5;
  const token = githubToken();
  const pullRequests: GithubPullRequestSummary[] = [];

  if (repos.length === 0) {
    return { ok: false, error: "No GitHub repos in project scope." };
  }

  for (const repo of repos) {
    const parsed = parseRepo(repo);
    if (!parsed) {
      return { ok: false, error: `Invalid GitHub repo scope: ${repo}` };
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}/pulls?state=open&per_page=${perRepoLimit}&sort=updated`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "truecrew-dashboard-chief",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetchImpl(url, { headers });
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "GitHub request failed",
      };
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      return {
        ok: false,
        error:
          body?.message ??
          `GitHub returned ${response.status} for ${parsed.owner}/${parsed.name}`,
      };
    }

    const rows = (await response.json()) as Array<{
      number?: number;
      title?: string;
      html_url?: string;
      updated_at?: string;
    }>;

    for (const row of rows) {
      if (typeof row.number !== "number" || typeof row.title !== "string") continue;
      pullRequests.push({
        repo: `${parsed.owner}/${parsed.name}`,
        number: row.number,
        title: row.title,
        url: typeof row.html_url === "string" ? row.html_url : "",
        updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
      });
    }
  }

  return {
    ok: true,
    pullRequests,
    authMode: token ? "token" : "anonymous",
  };
}
