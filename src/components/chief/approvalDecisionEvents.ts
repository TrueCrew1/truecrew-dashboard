type ApprovalDecisionListener = () => void;

const listeners = new Set<ApprovalDecisionListener>();

/** Broadcast that a Chief approval decision was recorded, so alert views can refresh in-session. */
export function notifyApprovalDecisionRecorded(): void {
  for (const listener of listeners) listener();
}

export function subscribeApprovalDecisionRecorded(
  listener: ApprovalDecisionListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
