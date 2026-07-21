import { routeChiefFallback, type ChiefFallbackResult } from "./modelRouter.js";

/**
 * Mirrors BUILD_APPROVAL_GATES[0] in src/components/chief/agentApprovalGates.ts
 * ("Code change merging to main"). Not imported directly — lib/ only takes
 * type-only imports from src/ elsewhere in this repo (see lib/task-context.ts,
 * lib/librarian/*), so this stays a literal, cross-referenced by name instead
 * of a new runtime lib→src dependency edge.
 */
const BUILD_GATE_MERGE_TO_MAIN = "Code change merging to main" as const;
type BuildApprovalGate = typeof BUILD_GATE_MERGE_TO_MAIN;

/**
 * ADVISORY ONLY — Build Plan Helper.
 *
 * Standalone dev-time tool for drafting a BuildApprovalRequest from a short
 * scoped-task prompt. It is NOT part of Chief's live command flow
 * (resolveChiefCommand / ChiefPanel) and never runs automatically — it's a
 * manual CLI invocation only (see scripts/build-plan-helper.ts).
 *
 * Guardrails, by design:
 *  - Reuses routeChiefFallback() from modelRouter.ts verbatim — no new
 *    models, no new routing rules, no change to category classification.
 *  - Every output is advisory text. Nothing here writes to
 *    agentApprovalGates.ts, opens a PR, or calls any deploy/mutation API.
 *  - draftBuildApprovalRequest() below is pure — no I/O, no side effects —
 *    so a human reviews the draft and copies it into agentApprovalGates.ts
 *    themselves only if they agree with it. That copy step IS the human
 *    approval gate for this helper's suggestion.
 */

export interface BuildPlanHelperOptions {
  /** Same meaning as ChiefRouteOptions.localOnly — skip Azure, Ollama only. */
  localOnly?: boolean;
}

export interface DraftBuildApprovalRequest {
  gate: BuildApprovalGate;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  testsOrChecksDone: { label: string; status: "pass" | "fail" | "pending" }[];
  requestedAction: string;
  /** Left empty — the helper doesn't know the real diff yet; fill in before use. */
  filesOrAreas: string[];
}

export interface BuildPlanHelperResult {
  prompt: string;
  /** null when no AI fallback tier is configured/reachable — a valid, expected outcome. */
  advisory: ChiefFallbackResult | null;
  draft: DraftBuildApprovalRequest;
}

/**
 * Pure and side-effect-free: builds a draft BuildApprovalRequest shape from
 * a prompt and an optional advisory suggestion. Never submitted anywhere by
 * this function — the caller (CLI) only prints it.
 *
 * Default riskLevel is the conservative "medium" per Builder-helper policy:
 * never auto-assign "low" (that reads as an implicit approve recommendation
 * before a human has reviewed anything) and never "high" without cause.
 */
export function draftBuildApprovalRequest(
  prompt: string,
  advisory: ChiefFallbackResult | null,
): DraftBuildApprovalRequest {
  const advisoryNote = advisory
    ? `AI-suggested plan (${advisory.source}/${advisory.model}, advisory only, unreviewed): ${advisory.summary}`
    : "No AI fallback was available when this draft was generated — plan below is the raw prompt only.";

  return {
    gate: BUILD_GATE_MERGE_TO_MAIN,
    summary: `Scoped Builder task: ${prompt}\n\n${advisoryNote}`,
    riskLevel: "medium",
    testsOrChecksDone: [
      {
        label: "AI suggestion is unreviewed — human must verify before relying on it",
        status: "pending",
      },
      { label: "Real tests/lint/build not yet run for the actual change", status: "pending" },
    ],
    requestedAction:
      "This is a DRAFT only. Review the AI suggestion above, do the real implementation, " +
      "run npm run qa, fill in filesOrAreas, then open this as a real BuildApprovalRequest " +
      "for Chief to route — nothing here has been submitted or approved.",
    filesOrAreas: [],
  };
}

/**
 * Runs the existing Chief AI fallback (unmodified) against a short prompt
 * and returns both the raw advisory text and a draft approval-card shape.
 * Never throws on "no fallback configured" — that's an expected, valid
 * result (advisory.advisory === null), not an error.
 */
export async function runBuildPlanHelper(
  prompt: string,
  options: BuildPlanHelperOptions = {},
): Promise<BuildPlanHelperResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("prompt is required");
  }

  const advisory = await routeChiefFallback(trimmed, "", { localOnly: options.localOnly, lane: "builder" });
  return {
    prompt: trimmed,
    advisory,
    draft: draftBuildApprovalRequest(trimmed, advisory),
  };
}
