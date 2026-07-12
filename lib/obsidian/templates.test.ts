import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { renderDecisionNote, renderMaintenanceNote, renderResearchFindingNote } from "./templates.js";

const LOGGED_AT = new Date("2026-07-08T15:30:00.000Z");

describe("governed note frontmatter (decision, maintenance)", () => {
  it("renderDecisionNote emits the minimal governed schema alongside its existing fields", () => {
    const { data } = matter(
      renderDecisionNote({
        title: "Keep vendor",
        decision: "Stay with current HVAC vendor.",
        loggedAt: LOGGED_AT,
      }),
    );

    expect(data.type).toBe("decision");
    expect(data.source).toBe("true-crew");
    expect(data.status).toBe("active");
    // owner is YAML null ("not yet set"), not a fabricated placeholder string.
    expect(data.owner).toBeNull();
    expect(data.source_of_truth).toBe("vault");
    // tags is a real empty YAML list, not a stringified placeholder.
    expect(data.tags).toEqual([]);
    // YAML parses a bare date scalar as a Date, not a string — intentional so
    // Obsidian Dataview can query it as a date.
    expect(data.last_reviewed).toBeInstanceOf(Date);
    expect((data.last_reviewed as Date).toISOString().slice(0, 10)).toBe("2026-07-08");
  });

  it("renderMaintenanceNote emits the minimal governed schema alongside its existing fields", () => {
    const { data } = matter(
      renderMaintenanceNote({
        title: "Replace HVAC filter",
        description: "Filter is past its service interval.",
        loggedAt: LOGGED_AT,
      }),
    );

    expect(data.type).toBe("maintenance");
    expect(data.source).toBe("true-crew");
    expect(data.status).toBe("active");
    // owner is YAML null ("not yet set"), not a fabricated placeholder string.
    expect(data.owner).toBeNull();
    expect(data.source_of_truth).toBe("vault");
    // tags is a real empty YAML list, not a stringified placeholder.
    expect(data.tags).toEqual([]);
    expect(data.last_reviewed).toBeInstanceOf(Date);
    expect((data.last_reviewed as Date).toISOString().slice(0, 10)).toBe("2026-07-08");
  });

  it("last_reviewed defaults to the note's logged date when loggedAt is omitted", () => {
    const { data } = matter(
      renderMaintenanceNote({
        title: "Replace belt",
        description: "Belt is worn.",
      }),
    );

    expect(data.last_reviewed).toBeInstanceOf(Date);
  });
});

describe("renderResearchFindingNote", () => {
  it("emits the governed schema plus the Research Finding Intake field set", () => {
    const rendered = renderResearchFindingNote({
      title: "Vitest vs Jest for this repo",
      sourcesChecked: "Vitest docs, existing vitest.config.ts",
      finding: "Vitest is already wired and faster; no migration needed.",
      loggedAt: LOGGED_AT,
    });
    const { data, content } = matter(rendered);

    expect(data.type).toBe("research-finding");
    expect(data.source).toBe("true-crew");
    expect(data.tier).toBe("log");
    expect(data.status).toBe("active");
    expect(data.owner).toBeNull();
    expect(data.source_of_truth).toBe("vault");
    expect(data.tags).toEqual([]);

    expect(content).toContain("### Research Finding Intake — Vitest vs Jest for this repo");
    expect(content).toContain("- ID: 2026-07-08-vitest-vs-jest-for-this-repo-01");
    expect(content).toContain("- Date: 2026-07-08");
    expect(content).toContain("- Agent: Research");
    expect(content).toContain("- Source(s) checked: Vitest docs, existing vitest.config.ts");
    expect(content).toContain(
      "- Finding: Vitest is already wired and faster; no migration needed.",
    );
    expect(content).toContain("- Worked: none");
    expect(content).toContain("- Failed: none");
    expect(content).toContain("- Next time: none");
    expect(content).toContain("- Tier: Log");
    expect(content).toContain("- Dedupe check: n/a for Log tier");
    expect(content).toContain(
      "- Destination: Obsidian — Research/2026-07-08 — Vitest vs Jest for this repo.md",
    );
    expect(content).toContain("- Related approval request: none");
    expect(content).toContain("- Related PR: none");
  });

  it("carries Worked/Failed/Next time and a non-Log tier through instead of defaulting to none", () => {
    const rendered = renderResearchFindingNote({
      title: "Evaluate Sentry alternatives",
      sourcesChecked: "Sentry pricing page, current @sentry/node usage",
      finding: "No compelling reason to switch; current setup covers our needs.",
      worked: "Cost comparison against current usage tier",
      failed: "Free-tier alternatives all capped below our event volume",
      nextTime: "Revisit only if event volume triples",
      tier: "Lesson",
      dedupeCheck: "Checked knowledge/lessons/ — no existing entry",
      relatedApprovalRequest: "none",
      relatedPr: "none",
      loggedAt: LOGGED_AT,
    });
    const { data, content } = matter(rendered);

    expect(data.tier).toBe("lesson");
    expect(content).toContain("- Worked: Cost comparison against current usage tier");
    expect(content).toContain("- Failed: Free-tier alternatives all capped below our event volume");
    expect(content).toContain("- Next time: Revisit only if event volume triples");
    expect(content).toContain("- Tier: Lesson");
    expect(content).toContain("- Dedupe check: Checked knowledge/lessons/ — no existing entry");
  });
});
