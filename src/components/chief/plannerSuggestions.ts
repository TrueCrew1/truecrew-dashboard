import type { PendingGate } from "./hooks/useBuildTasks";

/** Keeps the card compact — a task with more open gates just gets a "+N more" line. */
const MAX_CHECKLIST_STEPS = 3;

/**
 * Planner's advisory "how to close this out" checklist for a build-gate task —
 * one step per pending required gate (capped), plus a closing step. Read-only
 * and non-blocking: Build/Chief still owns the actual approval and gate work,
 * this is only a suggested order of operations derived from existing gate data.
 */
export function getPlannerChecklist(pendingGates: PendingGate[]): string[] {
  if (pendingGates.length === 0) return [];

  const steps = pendingGates.slice(0, MAX_CHECKLIST_STEPS).map((gate) => `Close: ${gate.name}`);

  if (pendingGates.length > MAX_CHECKLIST_STEPS) {
    steps.push(`+${pendingGates.length - MAX_CHECKLIST_STEPS} more gate(s) — see pending gates above.`);
  } else {
    steps.push("Confirm evidence and hand back to Chief for approval.");
  }

  return steps;
}
