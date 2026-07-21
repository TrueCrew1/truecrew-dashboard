import type { LatestResearchSummary, ResearchVerificationState } from "./latestResearchSource.js";
import { getWorkStories } from "../chief/workStories.js";

/**
 * POLICY FENCE: task-time research state must be obtained via this module
 * (or `./index.ts`, its barrel re-export) — do not bypass it by reading
 * `latestResearchSource.ts`'s raw summaries directly in UI or agent code.
 *
 * Task-time retrieval gate for Research findings — enforces the packaging
 * contract in docs/AGENT_RUNBOOK.md § Knowledge Precedence & Task-Time
 * Retrieval: a filed knowledge/sources/ note is only usable as authoritative
 * input for Chief/Build once it (a) maps to a real WorkStoryDefinition.id,
 * and (b) is labeled Verified or Cited. Anything short of that (an unmapped
 * id, a title-only match, a missing/unrecognized label, or a real Provisional
 * label) degrades instead of being silently treated as settled research.
 *
 * Deliberately has no import-time dependency on latestResearchSource.ts's
 * `import.meta.glob` (a type-only import erases at compile time) — this file
 * stays plain, dependency-free TypeScript so it can be unit-tested directly
 * under `tsx --test`, unlike the Vite-only glob loader.
 */

export type TaskTimeResearchStatus = "authoritative" | "provisional" | "unavailable";

interface TaskTimeResearchBase {
  status: TaskTimeResearchStatus;
  workStoryId: string;
}

export interface TaskTimeResearchAuthoritative extends TaskTimeResearchBase {
  status: "authoritative";
  verification: "verified" | "cited";
  source: LatestResearchSummary;
}

export interface TaskTimeResearchProvisional extends TaskTimeResearchBase {
  status: "provisional";
  verification: "provisional";
  source: LatestResearchSummary;
  reason: string;
}

export interface TaskTimeResearchUnavailable extends TaskTimeResearchBase {
  status: "unavailable";
  verification: null;
  source: null;
  reason: string;
}

export type TaskTimeResearchResult =
  | TaskTimeResearchAuthoritative
  | TaskTimeResearchProvisional
  | TaskTimeResearchUnavailable;

const AUTHORITATIVE_STATES: ReadonlySet<ResearchVerificationState> = new Set(["verified", "cited"]);

/**
 * Resolves whether a Work Story has task-time-retrievable research. Only a
 * note whose `work_story_id` matches a real `WorkStoryDefinition.id` even
 * counts — a note found only by the legacy title-fallback lookup in
 * latestResearchSource.ts is not retrievable here, closing the gap that
 * allowed an unmapped or mismatched finding to be treated as usable.
 */
export function resolveTaskTimeResearch(
  workStoryId: string,
  summaries: readonly LatestResearchSummary[],
): TaskTimeResearchResult {
  const isRealWorkStory = getWorkStories().some((story) => story.id === workStoryId);
  if (!isRealWorkStory) {
    return {
      status: "unavailable",
      workStoryId,
      verification: null,
      source: null,
      reason: `"${workStoryId}" does not match any WorkStoryDefinition.id in src/lib/chief/workStories.ts`,
    };
  }

  const source = summaries.find((summary) => summary.workStoryId === workStoryId);
  if (!source) {
    return {
      status: "unavailable",
      workStoryId,
      verification: null,
      source: null,
      reason: "No knowledge/sources/ note is filed with this work_story_id yet",
    };
  }

  // Every real LatestResearchSummary is already sourced from knowledge/sources/
  // (latestResearchSource.ts's glob has no other input), so this only ever
  // trips for a hand-built or malformed `summaries` array — a caller passing
  // something other than getAllResearchSummaries()'s output. Checked anyway:
  // "filed under knowledge/sources/" is one of the three contract legs
  // (docs/AGENT_RUNBOOK.md § Packaging research), and this gate should not
  // silently trust a source it can't itself prove was actually filed there.
  if (!source.path.startsWith("knowledge/sources/")) {
    return {
      status: "unavailable",
      workStoryId,
      verification: null,
      source: null,
      reason: `Note matched this work_story_id but its path ("${source.path}") is outside knowledge/sources/ — not a filed research note`,
    };
  }

  if (AUTHORITATIVE_STATES.has(source.verification)) {
    return {
      status: "authoritative",
      workStoryId,
      verification: source.verification as "verified" | "cited",
      source,
    };
  }

  return {
    status: "provisional",
    workStoryId,
    verification: "provisional",
    source,
    reason: "Filed note is labeled Provisional-Uncertain (or carries no recognized verification label) — not yet settled",
  };
}

export interface ResearchChiefDisplay {
  badgeLabel: string;
  badgeTone: "green" | "steel" | "yellow";
  detail: string;
}

/**
 * How Chief should visibly present a Work Story's research state. Provisional
 * and unavailable results are never rendered with the same badge tone as
 * authoritative ones — a caller can't accidentally present degraded research
 * as settled fact.
 */
export function describeResearchForChief(result: TaskTimeResearchResult): ResearchChiefDisplay {
  switch (result.status) {
    case "authoritative":
      return {
        badgeLabel: result.verification === "verified" ? "Verified" : "Cited",
        badgeTone: "green",
        detail: `${result.source.title} — updated ${result.source.createdDate} (${result.source.path})`,
      };
    case "provisional":
      return {
        badgeLabel: "Provisional",
        badgeTone: "yellow",
        detail: `${result.source.title} (${result.source.path}) — ${result.reason}. Not settled; do not present as authoritative.`,
      };
    case "unavailable":
      return {
        badgeLabel: "No research",
        badgeTone: "steel",
        detail: result.reason,
      };
  }
}

export interface ResearchBuildReadiness {
  /** True only for Verified/Cited research — the sole case allowed to support a high-confidence "ready" claim. */
  allowsHighConfidence: boolean;
  /** Null when authoritative (nothing to caveat); a short caveat to append to a readiness/checklist view otherwise. */
  caveat: string | null;
}

/**
 * How Build should factor research into a "ready to build" claim. Provisional
 * or missing research never allows a high-confidence claim and always carries
 * an explicit caveat, so it can't silently count the same as authoritative
 * research in a readiness/checklist view.
 */
export function describeResearchForBuildReadiness(result: TaskTimeResearchResult): ResearchBuildReadiness {
  if (result.status === "authoritative") {
    return { allowsHighConfidence: true, caveat: null };
  }
  if (result.status === "provisional") {
    return {
      allowsHighConfidence: false,
      caveat: "Research backing this story is provisional only — do not treat as settled.",
    };
  }
  return {
    allowsHighConfidence: false,
    caveat: "No task-time-retrievable research is filed for this story yet.",
  };
}

export interface RecentResearchActivityDisplay {
  badgeLabel: string;
  badgeTone: "green" | "steel" | "yellow";
  title: string;
  summary: string;
  createdDate: string;
  path: string;
}

/**
 * Honest presentation for "the single most recently filed note, whatever it
 * is" — a recency/activity indicator, not a task-time trust claim. It isn't
 * scoped to a Work Story, so `resolveTaskTimeResearch` doesn't apply; this
 * exists so a surface that wants "what's new" still goes through this module
 * instead of reading `latestResearchSource.ts` raw, and always carries the
 * note's own verification label so a Provisional note is never shown with the
 * same visual weight as a Verified/Cited one.
 */
export function describeRecentResearchActivity(
  summary: LatestResearchSummary | null,
): RecentResearchActivityDisplay | null {
  if (!summary) return null;

  const badgeLabel =
    summary.verification === "verified" ? "Verified" : summary.verification === "cited" ? "Cited" : "Provisional";

  return {
    badgeLabel,
    badgeTone: summary.verification === "provisional" ? "yellow" : "green",
    title: summary.title,
    summary: summary.summary,
    createdDate: summary.createdDate,
    path: summary.path,
  };
}
