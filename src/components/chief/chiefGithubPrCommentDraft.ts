import type { ProjectToolScope } from "@/data/projects";
import type { GithubPullRequestSummary } from "@/lib/api/client";
import {
  buildGithubPrCommentDraft,
  selectGithubPrForCommentDraft,
} from "@/lib/chief/githubPrCommentDraft";
import type { ChiefGithubPrCommentDraft, ChiefResponse, ChiefToolReadResult } from "./types";
import { GITHUB_PR_COMMENT_DRAFT_KIND } from "./types";

function withDraft(
  response: Omit<ChiefResponse, "githubPrCommentDraft" | "toolRead">,
  draft: ChiefGithubPrCommentDraft,
  toolRead: ChiefToolReadResult,
): ChiefResponse {
  return { ...response, githubPrCommentDraft: draft, toolRead };
}

/** Global: refuse project GitHub comment drafting until a project is selected. */
export function buildGithubCommentDraftGlobalRefusal(): ChiefResponse {
  return {
    summary:
      "Global has no project GitHub scope. Select a project before drafting a PR comment.",
    recommendedAction:
      "Switch Project from Global to a project, then ask to draft a GitHub PR comment.",
    routedTo: "Chief",
    approvalNeeded: false,
    toolRead: {
      source: "github",
      projectLabel: "Global",
      projectId: null,
      resultType: "PR comment draft",
      state: "no_scope",
      count: 0,
      scopePaths: [],
      items: [],
      emptyMessage: "Choose a project to draft a GitHub PR comment.",
    },
  };
}

export function buildGithubPrCommentDraftResponse(input: {
  scope: ProjectToolScope;
  command: string;
  pullRequests: GithubPullRequestSummary[];
  live: boolean;
  error?: string;
}): ChiefResponse {
  if (input.scope.githubRepos.length === 0) {
    return {
      summary: `Project ${input.scope.projectName} has no GitHub repos configured — cannot draft a scoped PR comment.`,
      recommendedAction: "Add githubRepos for this project in src/data/projects.ts.",
      routedTo: "Chief",
      approvalNeeded: false,
      toolRead: {
        source: "github",
        projectLabel: input.scope.projectName,
        projectId: input.scope.projectId,
        resultType: "PR comment draft",
        state: "unavailable",
        count: 0,
        scopePaths: [],
        items: [],
        emptyMessage: "No GitHub repos configured for this project.",
      },
    };
  }

  if (!input.live) {
    return {
      summary: `Project ${input.scope.projectName} GitHub scope: ${input.scope.githubRepos.join(", ")}. Live API is off — cannot load open PRs to draft a comment.`,
      recommendedAction: "Enable VITE_USE_LIVE_API to draft a comment on an open PR in this project.",
      routedTo: "Chief",
      approvalNeeded: false,
      toolRead: {
        source: "github",
        projectLabel: input.scope.projectName,
        projectId: input.scope.projectId,
        resultType: "PR comment draft",
        state: "unavailable",
        count: 0,
        scopePaths: [...input.scope.githubRepos],
        items: [],
        emptyMessage: "Live API off — open PRs not fetched for comment draft.",
      },
    };
  }

  if (input.error) {
    return {
      summary: `Could not load open PRs for comment draft: ${input.error}`,
      recommendedAction: "Check network / GitHub access and try again.",
      routedTo: "Chief",
      approvalNeeded: false,
      toolRead: {
        source: "github",
        projectLabel: input.scope.projectName,
        projectId: input.scope.projectId,
        resultType: "PR comment draft",
        state: "error",
        count: 0,
        scopePaths: [...input.scope.githubRepos],
        items: [],
        emptyMessage: input.error,
      },
    };
  }

  const pr = selectGithubPrForCommentDraft(input.pullRequests, input.command);
  if (!pr) {
    return {
      summary: `No matching open PR in ${input.scope.githubRepos.join(", ")} to draft a comment on.`,
      recommendedAction:
        "Open a PR in the project repo, or name an open PR number (e.g. draft comment on PR #12).",
      routedTo: "Chief",
      approvalNeeded: false,
      toolRead: {
        source: "github",
        projectLabel: input.scope.projectName,
        projectId: input.scope.projectId,
        resultType: "PR comment draft",
        state: "empty",
        count: 0,
        scopePaths: [...input.scope.githubRepos],
        items: [],
        emptyMessage: "No open PR available for a project-scoped comment draft.",
      },
    };
  }

  const draft = buildGithubPrCommentDraft({
    scope: input.scope,
    command: input.command,
    pullRequest: pr,
  });

  if (!draft) {
    return buildGithubCommentDraftGlobalRefusal();
  }

  const target = `${draft.repo}#${draft.prNumber}`;
  return withDraft(
    {
      summary: `Draft GitHub comment on ${target} (${draft.prTitle}) for ${draft.projectName}. Not posted yet — approval required.`,
      recommendedAction: `Review the comment draft, then approve to post it on ${target}.`,
      routedTo: "Chief",
      approvalNeeded: true,
      approvalTitle: `Post GitHub comment on ${target}`,
      approvalPrompt: `Approve posting comment on ${target}`,
      riskNote:
        "GitHub comment post is gated. Approving posts this draft on the selected project PR; rejecting discards it. No merge or close.",
      specialists: [
        {
          specialist: "Research Agent",
          contribution: `Prepared PR comment draft for ${target} (post pending approval)`,
        },
      ],
      approvalPacket: {
        recommendation: `Approve to post the comment on ${target}.`,
        riskLevel: "medium",
        rationale: "External GitHub comments are visible to collaborators and need an explicit operator decision.",
        evidence: [
          `Target: ${target} — ${draft.prTitle}`,
          `Repo scope: ${draft.repo}`,
          `Mission: ${GITHUB_PR_COMMENT_DRAFT_KIND}`,
        ],
        nextAction: "Approve to post, or reject to discard the draft.",
        improvementsMade: [
          "Draft only — no GitHub post until approval",
          "Target constrained to selected project githubRepos",
          "Comment only — no merge/close/push",
        ],
      },
    },
    draft,
    {
      source: "github",
      projectLabel: draft.projectName,
      projectId: draft.projectId,
      resultType: "PR comment draft",
      state: "ok",
      count: 1,
      scopePaths: [draft.repo],
      items: [
        {
          id: target,
          title: target,
          detail: draft.prTitle,
          href: draft.prUrl || undefined,
        },
      ],
    },
  );
}
