export const GATE_KEYS = {
  PR_OPENED: "pr_opened",
  CI_GREEN: "ci_green",
  PR_APPROVED: "pr_approved",
  GITHUB_BRANCH_LINKED: "github_branch_linked",
  ACCEPTANCE_CRITERIA: "acceptance_criteria",
  SELF_REVIEW_COMPLETE: "self_review_complete",
} as const;

export type GateKey = (typeof GATE_KEYS)[keyof typeof GATE_KEYS];

export function parseGithubRef(ref: string | null | undefined): {
  repo: string;
  issueNumber: number;
} | null {
  if (!ref) return null;
  const match = ref.match(/^([^#]+)#(\d+)$/);
  if (!match) return null;
  return { repo: match[1], issueNumber: Number(match[2]) };
}

export function normalizeRepo(fullName: string): string {
  return fullName.trim();
}
