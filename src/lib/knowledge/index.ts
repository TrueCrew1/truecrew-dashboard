/**
 * The sanctioned import surface for the knowledge layer's task-time research
 * state. UI and agent code that cares about "research-at-task-time" truth for
 * a Work Story, or wants to present a filed note's verification honestly,
 * imports from here (`@/lib/knowledge/index`) — never by reaching into
 * `./latestResearchSource.js` (raw glob-backed summaries) or
 * `./taskTimeResearch.js` (the pure gate logic) directly.
 */
import { getAllResearchSummaries, getLatestResearchSummary } from "./latestResearchSource.js";
import {
  describeRecentResearchActivity,
  describeResearchForBuildReadiness,
  describeResearchForChief,
  resolveTaskTimeResearch,
} from "./taskTimeResearch.js";
import type {
  RecentResearchActivityDisplay,
  ResearchBuildReadiness,
  ResearchChiefDisplay,
  TaskTimeResearchResult,
  TaskTimeResearchStatus,
} from "./taskTimeResearch.js";

export {
  describeResearchForBuildReadiness,
  describeResearchForChief,
  resolveTaskTimeResearch,
};
export type {
  RecentResearchActivityDisplay,
  ResearchBuildReadiness,
  ResearchChiefDisplay,
  TaskTimeResearchResult,
  TaskTimeResearchStatus,
};

/** Resolves task-time research for a Work Story against the live, glob-backed knowledge/sources/ notes. */
export function getTaskTimeResearchForWorkStory(workStoryId: string): TaskTimeResearchResult {
  return resolveTaskTimeResearch(workStoryId, getAllResearchSummaries());
}

/** The honestly-labeled "most recently filed note" activity indicator, wired to the live source — not a task-time trust claim, see describeRecentResearchActivity. */
export function getRecentResearchActivity(): RecentResearchActivityDisplay | null {
  return describeRecentResearchActivity(getLatestResearchSummary());
}
