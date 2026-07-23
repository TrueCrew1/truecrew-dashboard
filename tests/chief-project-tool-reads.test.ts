import { describe, expect, it, vi } from "vitest";
import {
  buildGithubScopeReadResponse,
  buildObsidianScopeReadResponse,
  matchChiefProjectToolIntent,
  runChiefProjectToolRead,
  toolReadSourceLabel,
  toolReadStateLabel,
} from "@/components/chief/chiefProjectToolReads";
import { filterNotesByObsidianPrefixes, notePathMatchesProjectPrefix } from "@/lib/chief/projectToolScopeFilters";
import { listOpenPullRequestsForRepos } from "../lib/github/listOpenPullRequests.js";
import { MS_PAINTING_PROJECT_ID, getProjectToolScope, KNOWN_APP_PROJECTS } from "@/data/projects";

describe("project tool scope filters", () => {
  it("matches notes under configured Obsidian prefixes only", () => {
    const notes = [
      { obsidianPath: "Projects/M&S Painting/Jobsite.md", title: "Jobsite" },
      { obsidianPath: "Projects/Other/Note.md", title: "Other" },
      { obsidianPath: "Operations/Build Log.md", title: "Build Log" },
    ];
    const scoped = filterNotesByObsidianPrefixes(notes, ["Projects/M&S Painting"]);
    expect(scoped.map((note) => note.title)).toEqual(["Jobsite"]);
    expect(notePathMatchesProjectPrefix("Projects/M&S Painting", "Projects/M&S Painting")).toBe(
      true,
    );
  });
});

describe("matchChiefProjectToolIntent", () => {
  it("detects GitHub and Obsidian read intents", () => {
    expect(matchChiefProjectToolIntent("List open PRs on GitHub")).toBe("github");
    expect(matchChiefProjectToolIntent("Show open pull requests")).toBe("github");
    expect(matchChiefProjectToolIntent("List Obsidian notes for this project")).toBe("obsidian");
    expect(matchChiefProjectToolIntent("What is at risk today?")).toBeNull();
  });
});

describe("Chief scoped tool read responses", () => {
  const scope = getProjectToolScope(KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID)!;

  it("attaches scannable GitHub toolRead metadata and items", () => {
    expect(
      buildGithubScopeReadResponse({
        scope: { ...scope, githubRepos: [] },
        pullRequests: [],
        live: true,
      }).toolRead?.state,
    ).toBe("unavailable");

    const withPrs = buildGithubScopeReadResponse({
      scope,
      pullRequests: [
        {
          repo: "TrueCrew1/ms-painting",
          number: 12,
          title: "Jobsite checklist",
          url: "https://github.com/TrueCrew1/ms-painting/pull/12",
          updatedAt: "2026-07-23T00:00:00Z",
        },
      ],
      live: true,
    });
    expect(withPrs.summary).toContain("TrueCrew1/ms-painting#12");
    expect(withPrs.recommendedAction).toMatch(/read-only/i);
    expect(withPrs.toolRead).toMatchObject({
      source: "github",
      projectLabel: "M&S Painting",
      projectId: MS_PAINTING_PROJECT_ID,
      resultType: "Open pull requests",
      state: "ok",
      count: 1,
    });
    expect(withPrs.toolRead?.items[0]?.title).toBe("TrueCrew1/ms-painting#12");
    expect(withPrs.toolRead?.scopePaths).toContain("TrueCrew1/ms-painting");
  });

  it("attaches scannable Obsidian toolRead metadata and empty Global no-scope", () => {
    const response = buildObsidianScopeReadResponse({
      scope,
      notes: [
        {
          title: "Jobsite",
          obsidianPath: "Projects/M&S Painting/Jobsite.md",
          summary: "Crew intake",
        },
      ],
      configured: true,
      live: true,
    });
    expect(response.summary).toContain("Projects/M&S Painting");
    expect(response.toolRead).toMatchObject({
      source: "obsidian",
      projectLabel: "M&S Painting",
      resultType: "Vault notes",
      state: "ok",
      count: 1,
    });
    expect(response.toolRead?.items[0]?.detail).toBe("Projects/M&S Painting/Jobsite.md");

    const empty = buildObsidianScopeReadResponse({
      scope,
      notes: [],
      configured: true,
      live: true,
    });
    expect(empty.toolRead?.state).toBe("empty");
    expect(empty.toolRead?.count).toBe(0);
  });

  it("labels count and Global no-scope for the UI strip", async () => {
    const ok = buildGithubScopeReadResponse({
      scope,
      pullRequests: [
        {
          repo: "TrueCrew1/ms-painting",
          number: 1,
          title: "A",
          url: "https://example.com/1",
          updatedAt: "",
        },
      ],
      live: true,
    }).toolRead!;
    expect(toolReadStateLabel(ok)).toBe("1 result");
    expect(toolReadSourceLabel("obsidian")).toBe("Obsidian");

    const empty = buildGithubScopeReadResponse({
      scope,
      pullRequests: [],
      live: true,
    }).toolRead!;
    expect(toolReadStateLabel(empty)).toBe("0 results");

    const global = await runChiefProjectToolRead("github", null);
    expect(global.toolRead).toMatchObject({
      source: "github",
      projectLabel: "Global",
      state: "no_scope",
      count: 0,
    });
    expect(toolReadStateLabel(global.toolRead!)).toBe("No project scope");
  });
});

describe("listOpenPullRequestsForRepos", () => {
  it("reads open PRs from GitHub API for scoped repos only", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("/repos/TrueCrew1/ms-painting/pulls");
      expect(url).toContain("state=open");
      return new Response(
        JSON.stringify([
          {
            number: 3,
            title: "Paint schedule",
            html_url: "https://github.com/TrueCrew1/ms-painting/pull/3",
            updated_at: "2026-07-22T12:00:00Z",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await listOpenPullRequestsForRepos(["TrueCrew1/ms-painting"], { fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pullRequests).toHaveLength(1);
    expect(result.pullRequests[0]?.title).toBe("Paint schedule");
  });

  it("rejects empty repo scope", async () => {
    const result = await listOpenPullRequestsForRepos([]);
    expect(result.ok).toBe(false);
  });
});
