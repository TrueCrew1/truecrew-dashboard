import { describe, expect, it } from "vitest";
import { formatChiefReplyLines } from "@/components/chief/chiefReplyFormat";
import { buildGithubScopeReadResponse } from "@/components/chief/chiefProjectToolReads";
import { getProjectToolScope, KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID } from "@/data/projects";

describe("Chief tool read reply presentation", () => {
  it("keeps four-line reply and attaches toolRead for UI block", () => {
    const scope = getProjectToolScope(KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID)!;
    const response = buildGithubScopeReadResponse({
      scope,
      pullRequests: [
        {
          repo: "TrueCrew1/ms-painting",
          number: 9,
          title: "Crew roster",
          url: "https://github.com/TrueCrew1/ms-painting/pull/9",
          updatedAt: "2026-07-23T00:00:00Z",
        },
      ],
      live: true,
    });

    const lines = formatChiefReplyLines(response);
    expect(lines.status).toContain("TrueCrew1/ms-painting#9");
    expect(lines.approvalRequest).toBe("none");
    expect(response.toolRead?.source).toBe("github");
    expect(response.toolRead?.projectLabel).toBe("M&S Painting");
    expect(response.toolRead?.count).toBe(1);
  });
});
