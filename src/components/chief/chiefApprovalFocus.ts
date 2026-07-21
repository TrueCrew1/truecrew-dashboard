/**
 * Minimal, shared "open this approval in Chief" signal — lets Today's
 * approval activity card (or any other surface) ask the always-mounted
 * Chief panel (see AppShell.tsx) to switch to its Approvals tab, clear any
 * status filter that would hide the target, and highlight/scroll to one
 * proposal's existing card (ApprovalBoard's dormant `focusProposalId` prop
 * and `.chief-approval-card--focused` pulse already do the rendering — this
 * module only carries the id across component boundaries).
 *
 * No persistence: Chief is always mounted alongside every page (AppShell
 * renders it as a permanent sibling of the routed content), so a listener
 * is always already subscribed by the time anything calls request() —
 * unlike chiefGovernanceEvents.ts's buffered log, there's no "fired before
 * anyone was listening" case to guard against here.
 */
export type ChiefApprovalFocusListener = (proposalId: string) => void;

const listeners = new Set<ChiefApprovalFocusListener>();

/** Ask Chief to open its Approvals tab and highlight this proposal. Best-effort: a no-op if nothing is subscribed. */
export function requestChiefApprovalFocus(proposalId: string): void {
  for (const listener of listeners) {
    listener(proposalId);
  }
}

/** Subscribe to focus requests. Returns an unsubscribe function. */
export function subscribeChiefApprovalFocus(listener: ChiefApprovalFocusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
