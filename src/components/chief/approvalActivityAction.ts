import { CHIEF_ROUTES, routeLabelForPath } from "./chiefRoutes";
import type { ApprovalProposal } from "./types";

export const APPROVAL_ACTIVITY_LIMIT = 5;

/**
 * Same "recently resolved" derivation ChiefQueueStrip already uses (status
 * !== pending, has a decision timestamp, newest-first) — kept here as its
 * own pure function so Today's activity card and any test can call it
 * without importing a component.
 */
export function selectRecentApprovalActivity(
  approvals: ApprovalProposal[],
  limit: number = APPROVAL_ACTIVITY_LIMIT,
): ApprovalProposal[] {
  return approvals
    .filter((proposal) => proposal.status !== "pending" && proposal.decidedAt)
    .sort((a, b) => {
      const aTime = a.decidedAt ? new Date(a.decidedAt).getTime() : 0;
      const bTime = b.decidedAt ? new Date(b.decidedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

type ApprovalActivityActionKind = "route" | "chief-focus";

export interface ApprovalActivityAction {
  kind: ApprovalActivityActionKind;
  label: string;
  /** Set when kind === "route" — a real in-app path (proposal.routeTo). */
  href?: string;
  /** Set when kind === "chief-focus" — the id ApprovalBoard's focusProposalId scrolls/highlights to. */
  proposalId?: string;
}

/**
 * Today's own page path — never a useful "go find the source" destination
 * from an activity item that's already rendered on Today.
 */
const NON_SPECIFIC_ROUTES = new Set<string>([CHIEF_ROUTES.today]);

/**
 * Derives the single most exact, real, provable action for one approval
 * activity item — never a fake or generic destination.
 *
 * Precedence: 1) proposal.routeTo, if it's a real and specific in-app route
 * (not just "Today", which is where the operator already is) — the exact
 * build/monitor/review/knowledge context the proposal itself was routed to.
 * 2) Otherwise, "Open in Chief" — jumps to and highlights this proposal's
 * own card on the Chief Approvals tab (see chiefApprovalFocus.ts /
 * ApprovalBoard's focusProposalId), which is always real for any proposal
 * that actually has an id. 3) Otherwise, no action.
 */
export function deriveApprovalActivityAction(
  proposal: Pick<ApprovalProposal, "id" | "routeTo" | "routeLabel">,
): ApprovalActivityAction | null {
  if (proposal.routeTo && !NON_SPECIFIC_ROUTES.has(proposal.routeTo)) {
    return {
      kind: "route",
      label: `Open ${proposal.routeLabel ?? routeLabelForPath(proposal.routeTo)}`,
      href: proposal.routeTo,
    };
  }

  if (proposal.id) {
    return {
      kind: "chief-focus",
      label: "Open in Chief",
      proposalId: proposal.id,
    };
  }

  return null;
}
