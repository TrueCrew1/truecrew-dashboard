import { useSyncExternalStore } from "react";
import type { ApprovalProposal } from "./types";

type Listener = () => void;

let commandApprovals: ApprovalProposal[] = [];
const listeners = new Set<Listener>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ApprovalProposal[] {
  return commandApprovals;
}

/** Add a proposal created via a typed Chief command, newest first. Session-only — not persisted. */
export function addCommandApproval(proposal: ApprovalProposal): void {
  commandApprovals = [proposal, ...commandApprovals];
  emitChange();
}

/**
 * Shared session store for approval proposals created via typed Chief commands.
 * ChiefPanel writes to it; anything reading via this hook (ChiefPanel itself,
 * useApprovalAlerts) sees the same list without prop drilling or duplicated state.
 */
export function useCommandApprovals(): ApprovalProposal[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
