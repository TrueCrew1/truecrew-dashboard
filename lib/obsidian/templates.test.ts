import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { renderDecisionNote, renderMaintenanceNote } from "./templates.js";

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
