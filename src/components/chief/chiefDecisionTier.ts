import type { ChiefApprovalPacket, ChiefDecisionTier, ChiefResponse, ChiefRiskLevel } from "./types";

/**
 * What Chief needs to evaluate a single item against the decision-tier
 * rules below. Deliberately minimal — this is the read-only, rules-first
 * triage layer, distinct from the deterministic command router
 * (chiefLiveContext.ts's resolveChiefCommand / lib/chief/resolveCommand.ts) and the AI fallback
 * (lib/chief/chiefAiFallback.ts). No AI involved here on purpose.
 */
export interface ChiefEvaluationInput {
  /** Short description of the item being evaluated. */
  summary: string;
  riskLevel: ChiefRiskLevel;
  /** False means the action can't be cleanly undone — always forces "approve" regardless of risk level, matching the runbook's "no irreversible action without a cleared card" rule. */
  reversible: boolean;
  /** Client-visible, public, or external-facing — always forces "approve", matching Content's "external copy — no surprises" rule. */
  externalFacing?: boolean;
  /** Touches production directly — always forces "approve", matching Build's "production-impacting refactor" gate. */
  affectsProduction?: boolean;
  /** Supporting facts Chief already gathered — becomes the packet's `evidence` verbatim when escalated. */
  evidence?: string[];
  /** What Chief already filtered/bundled/discarded before this evaluation — becomes the packet's `improvementsMade` verbatim when escalated. */
  improvementsMade?: string[];
  /** Plain-language next step if this does need operator attention. Defaults to a generic "review and decide" line. */
  nextAction?: string;
}

export interface ChiefEvaluationResult {
  tier: ChiefDecisionTier;
  /** Only present when tier is "approve". */
  approvalPacket?: ChiefApprovalPacket;
}

const DEFAULT_NEXT_ACTION = "Review and decide — no default action will be taken.";

function buildRationale(input: ChiefEvaluationInput): string {
  const reasons: string[] = [];
  if (input.riskLevel === "high") reasons.push("risk level is high");
  if (input.affectsProduction) reasons.push("this affects production");
  if (input.externalFacing) reasons.push("this is external-facing");
  if (!input.reversible) reasons.push("this action is not reversible");
  if (reasons.length === 0) {
    reasons.push("risk level is medium and this did not clear the bar for Chief to decide on its own");
  }
  return `Escalated because ${reasons.join("; ")}.`;
}

function buildApprovalPacket(input: ChiefEvaluationInput): ChiefApprovalPacket {
  return {
    recommendation:
      input.riskLevel === "high"
        ? "Hold — review before proceeding."
        : "Approve if the rationale and evidence below check out.",
    riskLevel: input.riskLevel,
    rationale: buildRationale(input),
    evidence: input.evidence ?? [],
    nextAction: input.nextAction ?? DEFAULT_NEXT_ACTION,
    improvementsMade: input.improvementsMade ?? [],
  };
}

/**
 * Deterministic, rules-first classification — no AI, no side effects, no
 * write automation. Precedence, first match wins:
 * 1. High risk, production-affecting, external-facing, or irreversible -> "approve" (with a packet).
 * 2. Medium risk (and none of the above) -> "notify".
 * 3. Otherwise (low risk, reversible, internal) -> "decide".
 */
export function classifyChiefEvaluation(input: ChiefEvaluationInput): ChiefEvaluationResult {
  const mustEscalate =
    input.riskLevel === "high" ||
    input.affectsProduction === true ||
    input.externalFacing === true ||
    input.reversible === false;

  if (mustEscalate) {
    return { tier: "approve", approvalPacket: buildApprovalPacket(input) };
  }

  if (input.riskLevel === "medium") {
    return { tier: "notify" };
  }

  return { tier: "decide" };
}

/**
 * Smallest real wiring point: derives an evaluation input from an existing
 * ChiefResponse (chiefLiveContext.ts's resolveChiefCommand output) so the
 * classifier can run over Chief's actual command-response path without
 * touching resolveChiefCommand or any individual resolver. A response that
 * already flagged approvalNeeded is treated as high risk (it already
 * concluded operator judgment is required); everything else is treated as
 * low risk and reversible — a deliberately conservative default until a
 * richer signal exists.
 */
export function evaluationInputFromChiefResponse(response: ChiefResponse): ChiefEvaluationInput {
  return {
    summary: response.summary,
    riskLevel: response.approvalNeeded ? "high" : "low",
    reversible: !response.approvalNeeded,
    evidence: response.blockers ?? [],
    nextAction: response.recommendedAction,
    improvementsMade: [],
  };
}
