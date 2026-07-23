import type { ProjectToolScope } from "@/data/projects";
import type {
  ChiefResponse,
  ChiefToolReadItem,
  ChiefToolReadResult,
  ChiefToolReadSource,
} from "./types";
import { filterNotesByObsidianPrefixes } from "@/lib/chief/projectToolScopeFilters";
import {
  fetchGithubOpenPullRequests,
  fetchObsidianNotes,
  isLiveApiEnabled,
  type GithubPullRequestSummary,
} from "@/lib/api/client";
import {
  buildObsidianDraftGlobalRefusal,
  buildObsidianNoteDraftResponse,
} from "./chiefObsidianNoteDraft";
import {
  buildGithubCommentDraftGlobalRefusal,
  buildGithubPrCommentDraftResponse,
} from "./chiefGithubPrCommentDraft";

export type ChiefProjectToolIntent =
  | "github"
  | "obsidian"
  | "obsidian_draft"
  | "github_comment_draft";

/** Match project tool intents (GitHub / Obsidian list + drafts). */
export function matchChiefProjectToolIntent(input: string): ChiefProjectToolIntent | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Draft comment before generic GitHub list.
  if (
    /\b(comment|comments)\b/i.test(trimmed) &&
    (/\b(draft|propose|prepare|post)\b/i.test(trimmed) || /\b(create|new)\b/i.test(trimmed)) &&
    (/\b(github|pr|pull\s*request)\b/i.test(trimmed) || /#\d+\b/.test(trimmed))
  ) {
    return "github_comment_draft";
  }

  if (
    /\b(github)\b/i.test(trimmed) ||
    /\b(open\s+prs?|pull\s+requests?)\b/i.test(trimmed)
  ) {
    return "github";
  }

  // Draft before list — both mention obsidian/note.
  if (
    /\b(obsidian|vault|note)\b/i.test(trimmed) &&
    (/\b(draft|propose|prepare)\b/i.test(trimmed) ||
      (/\b(create|new)\b/i.test(trimmed) && /\bnote\b/i.test(trimmed)))
  ) {
    return "obsidian_draft";
  }

  if (
    /\b(obsidian|vault)\b/i.test(trimmed) &&
    /\b(note|notes|list|show|read|browse)\b/i.test(trimmed)
  ) {
    return "obsidian";
  }

  return null;
}

function sourceLabel(source: ChiefToolReadSource): string {
  return source === "github" ? "GitHub" : "Obsidian";
}

function resultTypeFor(source: ChiefToolReadSource): string {
  return source === "github" ? "Open pull requests" : "Vault notes";
}

function withToolRead(
  response: Omit<ChiefResponse, "toolRead">,
  toolRead: ChiefToolReadResult,
): ChiefResponse {
  return { ...response, toolRead };
}

function globalNoScopeResponse(intent: ChiefToolReadSource): ChiefResponse {
  const source = intent;
  const surface = sourceLabel(source);
  return withToolRead(
    {
      summary: `Global has no project-specific ${surface} scope. Select a project to read that project's configured ${surface} paths.`,
      recommendedAction: "Switch Project from Global to a project, then ask again.",
      routedTo: "Chief",
      specialists: [
        {
          specialist: "Librarian Agent",
          contribution: `${surface} project scope is driven by activeToolScope`,
        },
      ],
    },
    {
      source,
      projectLabel: "Global",
      projectId: null,
      resultType: resultTypeFor(source),
      state: "no_scope",
      count: 0,
      scopePaths: [],
      items: [],
      emptyMessage: `No project-specific ${surface} scope on Global.`,
    },
  );
}

function formatPrLine(pr: GithubPullRequestSummary): string {
  return `${pr.repo}#${pr.number} ${pr.title}`;
}

function githubItems(pullRequests: GithubPullRequestSummary[]): ChiefToolReadItem[] {
  return pullRequests.slice(0, 8).map((pr) => ({
    id: `${pr.repo}#${pr.number}`,
    title: `${pr.repo}#${pr.number}`,
    detail: pr.title,
    href: pr.url || undefined,
  }));
}

function noteItems(
  notes: Array<{ title: string; obsidianPath: string; summary: string }>,
): ChiefToolReadItem[] {
  return notes.slice(0, 8).map((note) => ({
    id: note.obsidianPath,
    title: note.title,
    detail: note.obsidianPath,
  }));
}

export function buildGithubScopeReadResponse(input: {
  scope: ProjectToolScope;
  pullRequests: GithubPullRequestSummary[];
  error?: string;
  live: boolean;
}): ChiefResponse {
  const repos = input.scope.githubRepos;
  const projectLabel = input.scope.projectName;
  const baseMeta = {
    source: "github" as const,
    projectLabel,
    projectId: input.scope.projectId,
    resultType: resultTypeFor("github"),
    scopePaths: [...repos],
  };

  if (repos.length === 0) {
    return withToolRead(
      {
        summary: `Project ${projectLabel} has no GitHub repos configured in tool scope.`,
        recommendedAction: "Add githubRepos for this project in src/data/projects.ts.",
        routedTo: "Chief",
      },
      {
        ...baseMeta,
        state: "unavailable",
        count: 0,
        items: [],
        emptyMessage: "No GitHub repos configured for this project.",
      },
    );
  }

  if (!input.live) {
    return withToolRead(
      {
        summary: `Project ${projectLabel} GitHub scope: ${repos.join(", ")}. Live API is off — open PR list was not fetched.`,
        recommendedAction: "Enable VITE_USE_LIVE_API to read open PRs for this project's repos.",
        routedTo: "Chief",
      },
      {
        ...baseMeta,
        state: "unavailable",
        count: 0,
        items: [],
        emptyMessage: "Live API off — open PRs not fetched.",
      },
    );
  }

  if (input.error) {
    return withToolRead(
      {
        summary: `Could not read open PRs for ${repos.join(", ")}: ${input.error}`,
        recommendedAction: "Check network / GITHUB_TOKEN (optional for public repos) and try again.",
        routedTo: "Chief",
      },
      {
        ...baseMeta,
        state: "error",
        count: 0,
        items: [],
        emptyMessage: input.error,
      },
    );
  }

  if (input.pullRequests.length === 0) {
    return withToolRead(
      {
        summary: `No open pull requests in scoped repo(s): ${repos.join(", ")}.`,
        recommendedAction: "Nothing to review on GitHub for this project right now.",
        routedTo: "Chief",
      },
      {
        ...baseMeta,
        state: "empty",
        count: 0,
        items: [],
        emptyMessage: "No open pull requests in project GitHub scope.",
      },
    );
  }

  const items = githubItems(input.pullRequests);
  const top = input.pullRequests.slice(0, 5);
  return withToolRead(
    {
      summary: `Open PRs in ${repos.join(", ")}: ${top.map(formatPrLine).join("; ")}.`,
      recommendedAction: `Review ${formatPrLine(top[0])} in GitHub (read-only — no merge from Chief).`,
      routedTo: "Chief",
      specialists: [
        {
          specialist: "Research Agent",
          contribution: `Listed ${input.pullRequests.length} open PR(s) in project GitHub scope`,
        },
      ],
    },
    {
      ...baseMeta,
      state: "ok",
      count: input.pullRequests.length,
      items,
    },
  );
}

export function buildObsidianScopeReadResponse(input: {
  scope: ProjectToolScope;
  notes: Array<{ title: string; obsidianPath: string; summary: string }>;
  configured?: boolean;
  error?: string;
  live: boolean;
}): ChiefResponse {
  const prefixes = input.scope.obsidianPathPrefixes;
  const projectLabel = input.scope.projectName;
  const baseMeta = {
    source: "obsidian" as const,
    projectLabel,
    projectId: input.scope.projectId,
    resultType: resultTypeFor("obsidian"),
    scopePaths: [...prefixes],
  };

  if (prefixes.length === 0) {
    return withToolRead(
      {
        summary: `Project ${projectLabel} has no Obsidian path prefixes configured in tool scope.`,
        recommendedAction: "Add obsidianPathPrefixes for this project in src/data/projects.ts.",
        routedTo: "Chief",
      },
      {
        ...baseMeta,
        state: "unavailable",
        count: 0,
        items: [],
        emptyMessage: "No Obsidian path prefixes configured for this project.",
      },
    );
  }

  if (!input.live) {
    return withToolRead(
      {
        summary: `Project ${projectLabel} Obsidian scope: ${prefixes.join(", ")}. Live API is off — vault notes were not fetched.`,
        recommendedAction:
          "Enable VITE_USE_LIVE_API and OBSIDIAN_VAULT_PATH to list notes under this project's prefixes.",
        routedTo: "Librarian Agent",
      },
      {
        ...baseMeta,
        state: "unavailable",
        count: 0,
        items: [],
        emptyMessage: "Live API off — vault notes not fetched.",
      },
    );
  }

  if (input.error) {
    return withToolRead(
      {
        summary: `Could not read Obsidian notes under ${prefixes.join(", ")}: ${input.error}`,
        recommendedAction: "Check OBSIDIAN_VAULT_PATH and vault readability, then try again.",
        routedTo: "Librarian Agent",
      },
      {
        ...baseMeta,
        state: "error",
        count: 0,
        items: [],
        emptyMessage: input.error,
      },
    );
  }

  if (input.configured === false) {
    return withToolRead(
      {
        summary: `Obsidian vault is not configured. Project scope would be: ${prefixes.join(", ")}.`,
        recommendedAction: "Set OBSIDIAN_VAULT_PATH to list notes for this project.",
        routedTo: "Librarian Agent",
      },
      {
        ...baseMeta,
        state: "unavailable",
        count: 0,
        items: [],
        emptyMessage: "Obsidian vault is not configured.",
      },
    );
  }

  if (input.notes.length === 0) {
    return withToolRead(
      {
        summary: `No vault notes under project prefixes: ${prefixes.join(", ")}.`,
        recommendedAction:
          "Add notes under those paths, or adjust obsidianPathPrefixes for this project.",
        routedTo: "Librarian Agent",
      },
      {
        ...baseMeta,
        state: "empty",
        count: 0,
        items: [],
        emptyMessage: "No vault notes under project Obsidian scope.",
      },
    );
  }

  const top = input.notes.slice(0, 5);
  return withToolRead(
    {
      summary: `Found ${input.notes.length} note(s) under ${prefixes.join(", ")}: ${top.map((note) => `${note.title} (${note.obsidianPath})`).join("; ")}.`,
      recommendedAction: `Open "${top[0].title}" in Obsidian (${top[0].obsidianPath}).`,
      routedTo: "Librarian Agent",
      specialists: [
        {
          specialist: "Librarian Agent",
          contribution: `Listed ${input.notes.length} note(s) in project Obsidian scope`,
        },
      ],
    },
    {
      ...baseMeta,
      state: "ok",
      count: input.notes.length,
      items: noteItems(input.notes),
    },
  );
}

/**
 * Run one GitHub/Obsidian project tool action using activeToolScope.
 * Global (null scope) → explicit no project-specific scope (drafts refuse).
 */
export async function runChiefProjectToolRead(
  intent: ChiefProjectToolIntent,
  scope: ProjectToolScope | null,
  command = "",
): Promise<ChiefResponse> {
  if (intent === "obsidian_draft") {
    if (!scope) return buildObsidianDraftGlobalRefusal();
    return buildObsidianNoteDraftResponse({ scope, command });
  }

  if (intent === "github_comment_draft") {
    if (!scope) return buildGithubCommentDraftGlobalRefusal();
    const live = isLiveApiEnabled();
    if (!live) {
      return buildGithubPrCommentDraftResponse({
        scope,
        command,
        pullRequests: [],
        live: false,
      });
    }
    try {
      const result = await fetchGithubOpenPullRequests(scope.githubRepos);
      if (!result.ok) {
        return buildGithubPrCommentDraftResponse({
          scope,
          command,
          pullRequests: [],
          live: true,
          error: result.error,
        });
      }
      return buildGithubPrCommentDraftResponse({
        scope,
        command,
        pullRequests: result.pullRequests,
        live: true,
      });
    } catch (error) {
      return buildGithubPrCommentDraftResponse({
        scope,
        command,
        pullRequests: [],
        live: true,
        error: error instanceof Error ? error.message : "GitHub read failed",
      });
    }
  }

  if (!scope) return globalNoScopeResponse(intent === "github" ? "github" : "obsidian");

  const live = isLiveApiEnabled();

  if (intent === "github") {
    if (!live) {
      return buildGithubScopeReadResponse({ scope, pullRequests: [], live: false });
    }
    try {
      const result = await fetchGithubOpenPullRequests(scope.githubRepos);
      if (!result.ok) {
        return buildGithubScopeReadResponse({
          scope,
          pullRequests: [],
          error: result.error,
          live: true,
        });
      }
      return buildGithubScopeReadResponse({
        scope,
        pullRequests: result.pullRequests,
        live: true,
      });
    } catch (error) {
      return buildGithubScopeReadResponse({
        scope,
        pullRequests: [],
        error: error instanceof Error ? error.message : "GitHub read failed",
        live: true,
      });
    }
  }

  if (!live) {
    return buildObsidianScopeReadResponse({ scope, notes: [], live: false });
  }

  try {
    const { notes, configured } = await fetchObsidianNotes();
    const scoped = filterNotesByObsidianPrefixes(notes, scope.obsidianPathPrefixes);
    return buildObsidianScopeReadResponse({
      scope,
      notes: scoped.map((note) => ({
        title: note.title,
        obsidianPath: note.obsidianPath,
        summary: note.summary ?? "",
      })),
      configured,
      live: true,
    });
  } catch (error) {
    return buildObsidianScopeReadResponse({
      scope,
      notes: [],
      error: error instanceof Error ? error.message : "Obsidian read failed",
      live: true,
    });
  }
}

/** Labels for UI meta strip — kept pure for tests. */
export function toolReadSourceLabel(source: ChiefToolReadSource): string {
  return sourceLabel(source);
}

export function toolReadStateLabel(result: ChiefToolReadResult): string {
  switch (result.state) {
    case "ok":
      return `${result.count} result${result.count === 1 ? "" : "s"}`;
    case "empty":
      return "0 results";
    case "no_scope":
      return "No project scope";
    case "unavailable":
      return "Unavailable";
    case "error":
      return "Error";
    default:
      return result.state;
  }
}
