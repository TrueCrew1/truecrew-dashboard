import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeRecentResearchActivity,
  describeResearchForBuildReadiness,
  describeResearchForChief,
  resolveTaskTimeResearch,
} from "./taskTimeResearch";
import type { TaskTimeResearchResult } from "./taskTimeResearch";
import type { LatestResearchSummary } from "./latestResearchSource";

// Real WorkStoryDefinition.id from src/lib/chief/workStories.ts — the gate
// validates against the real WORK_STORIES list, so tests use a real id rather
// than mocking it.
const REAL_WORK_STORY_ID = "story-billing-rate-limiter";
const UNKNOWN_WORK_STORY_ID = "story-does-not-exist";

/** Asserts (and narrows) the result's discriminant so callers get real property types back. */
function assertStatus<S extends TaskTimeResearchResult["status"]>(
  result: TaskTimeResearchResult,
  status: S,
): asserts result is Extract<TaskTimeResearchResult, { status: S }> {
  assert.equal(result.status, status);
}

function fixtureNote(overrides: Partial<LatestResearchSummary> = {}): LatestResearchSummary {
  return {
    title: "Fixture note",
    origin: "test fixture",
    summary: "test summary",
    createdDate: "2026-07-19T00:00:00.000Z",
    path: "knowledge/sources/fixture.md",
    verification: "provisional",
    workStoryId: undefined,
    ...overrides,
  };
}

test("resolveTaskTimeResearch: verified note mapped to a real Work Story -> authoritative", () => {
  const note = fixtureNote({ workStoryId: REAL_WORK_STORY_ID, verification: "verified" });
  const result = resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]);

  assertStatus(result, "authoritative");
  assert.equal(result.verification, "verified");
  assert.equal(result.source, note);
});

test("resolveTaskTimeResearch: cited note mapped to a real Work Story -> also authoritative", () => {
  const note = fixtureNote({ workStoryId: REAL_WORK_STORY_ID, verification: "cited" });
  const result = resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]);

  assertStatus(result, "authoritative");
  assert.equal(result.verification, "cited");
});

test("resolveTaskTimeResearch: provisional note -> provisional, never authoritative", () => {
  const note = fixtureNote({ workStoryId: REAL_WORK_STORY_ID, verification: "provisional" });
  const result = resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]);

  assertStatus(result, "provisional");
  assert.equal(result.source, note);
  assert.match(result.reason, /Provisional/);
});

test("resolveTaskTimeResearch: workStoryId not in WORK_STORIES -> unavailable, even if a note claims it", () => {
  const note = fixtureNote({ workStoryId: UNKNOWN_WORK_STORY_ID, verification: "verified" });
  const result = resolveTaskTimeResearch(UNKNOWN_WORK_STORY_ID, [note]);

  assertStatus(result, "unavailable");
  assert.equal(result.source, null);
  assert.match(result.reason, /does not match any WorkStoryDefinition/);
});

test("resolveTaskTimeResearch: real Work Story with no filed note at all -> unavailable", () => {
  const result = resolveTaskTimeResearch(REAL_WORK_STORY_ID, []);

  assertStatus(result, "unavailable");
  assert.equal(result.source, null);
  assert.match(result.reason, /No knowledge\/sources\/ note/);
});

test("resolveTaskTimeResearch: a note without work_story_id (title-fallback territory) is not retrievable", () => {
  // This is the known weak spot the gate closes: latestResearchSource.ts's
  // legacy findLatestResearchSummaryByTitle() would match this note by title,
  // but the gate must not — only an exact work_story_id mapping counts.
  const note = fixtureNote({ title: "Billing API rate limiter", verification: "verified" });
  const result = resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]);

  assert.equal(result.status, "unavailable");
});

test("resolveTaskTimeResearch: a note outside knowledge/sources/ is not retrievable even if verified and mapped", () => {
  // A malformed summaries array (not actually sourced from
  // getAllResearchSummaries()'s knowledge/sources/ glob) must not be trusted
  // just because work_story_id and verification both look right.
  const note = fixtureNote({
    workStoryId: REAL_WORK_STORY_ID,
    verification: "verified",
    path: "drafts/2026-07-18-unfiled-note.md",
  });
  const result = resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]);

  assertStatus(result, "unavailable");
  assert.equal(result.source, null);
  assert.match(result.reason, /outside knowledge\/sources\//);
});

test("describeResearchForChief: authoritative -> green Verified/Cited badge, no hedging language", () => {
  const note = fixtureNote({ workStoryId: REAL_WORK_STORY_ID, verification: "verified" });
  const display = describeResearchForChief(resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]));

  assert.equal(display.badgeLabel, "Verified");
  assert.equal(display.badgeTone, "green");
  assert.match(display.detail, /Fixture note/);
});

test("describeResearchForChief: provisional -> visibly degraded, never a green/authoritative badge", () => {
  const note = fixtureNote({ workStoryId: REAL_WORK_STORY_ID, verification: "provisional" });
  const display = describeResearchForChief(resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]));

  assert.equal(display.badgeLabel, "Provisional");
  assert.notEqual(display.badgeTone, "green");
  assert.match(display.detail, /[Nn]ot settled/);
});

test("describeResearchForChief: unavailable -> clear missing-research state, not confused with provisional", () => {
  const display = describeResearchForChief(resolveTaskTimeResearch(REAL_WORK_STORY_ID, []));

  assert.equal(display.badgeLabel, "No research");
  assert.equal(display.badgeTone, "steel");
});

test("describeResearchForBuildReadiness: authoritative research allows high confidence with no caveat", () => {
  const note = fixtureNote({ workStoryId: REAL_WORK_STORY_ID, verification: "cited" });
  const readiness = describeResearchForBuildReadiness(resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]));

  assert.equal(readiness.allowsHighConfidence, true);
  assert.equal(readiness.caveat, null);
});

test("describeResearchForBuildReadiness: provisional research never allows high confidence, and carries a caveat", () => {
  const note = fixtureNote({ workStoryId: REAL_WORK_STORY_ID, verification: "provisional" });
  const readiness = describeResearchForBuildReadiness(resolveTaskTimeResearch(REAL_WORK_STORY_ID, [note]));

  assert.equal(readiness.allowsHighConfidence, false);
  assert.ok(readiness.caveat);
  assert.match(readiness.caveat ?? "", /provisional/i);
});

test("describeResearchForBuildReadiness: unavailable research never allows high confidence either", () => {
  const readiness = describeResearchForBuildReadiness(resolveTaskTimeResearch(REAL_WORK_STORY_ID, []));

  assert.equal(readiness.allowsHighConfidence, false);
  assert.ok(readiness.caveat);
});

test("describeResearchForBuildReadiness: provisional and unavailable caveats are distinct, not a generic fallback", () => {
  const provisionalNote = fixtureNote({ workStoryId: REAL_WORK_STORY_ID, verification: "provisional" });
  const provisionalCaveat = describeResearchForBuildReadiness(
    resolveTaskTimeResearch(REAL_WORK_STORY_ID, [provisionalNote]),
  ).caveat;
  const unavailableCaveat = describeResearchForBuildReadiness(
    resolveTaskTimeResearch(REAL_WORK_STORY_ID, []),
  ).caveat;

  assert.notEqual(provisionalCaveat, unavailableCaveat);
});

test("describeRecentResearchActivity: null summary (nothing filed) -> null", () => {
  assert.equal(describeRecentResearchActivity(null), null);
});

test("describeRecentResearchActivity: verified note -> green Verified badge", () => {
  const display = describeRecentResearchActivity(fixtureNote({ verification: "verified" }));

  assert.ok(display);
  assert.equal(display.badgeLabel, "Verified");
  assert.equal(display.badgeTone, "green");
});

test("describeRecentResearchActivity: cited note -> green Cited badge", () => {
  const display = describeRecentResearchActivity(fixtureNote({ verification: "cited" }));

  assert.ok(display);
  assert.equal(display.badgeLabel, "Cited");
  assert.equal(display.badgeTone, "green");
});

test("describeRecentResearchActivity: provisional note -> yellow Provisional badge, never green", () => {
  // This is the exact bug this function exists to prevent: the single most
  // recently filed note across the whole app can be Provisional while an
  // older note elsewhere is authoritative — it must never borrow the green
  // "settled" tone just because it's the newest thing filed.
  const display = describeRecentResearchActivity(fixtureNote({ verification: "provisional" }));

  assert.ok(display);
  assert.equal(display.badgeLabel, "Provisional");
  assert.notEqual(display.badgeTone, "green");
});
