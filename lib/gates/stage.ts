export const STAGE_ORDER = [
  "Inbox",
  "Triage",
  "Planned",
  "In Progress",
  "Waiting",
  "Review",
  "Done",
  "Logged",
] as const;

export type StageName = (typeof STAGE_ORDER)[number];

const TERMINAL_STAGES = new Set<string>(["Done", "Logged"]);

export interface GateLike {
  required: boolean;
  passed: boolean;
}

export function getBlockingGates<T extends GateLike>(gates: T[]): T[] {
  return gates.filter((g) => g.required && !g.passed);
}

export function allRequiredGatesPassed(gates: GateLike[]): boolean {
  return getBlockingGates(gates).length === 0;
}

export function getNextStage(current: string): StageName | null {
  const index = STAGE_ORDER.indexOf(current as StageName);
  if (index < 0 || index >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[index + 1];
}

export function canAdvanceStage(current: string, gates: GateLike[]): boolean {
  if (TERMINAL_STAGES.has(current)) return false;
  if (!allRequiredGatesPassed(gates)) return false;
  return getNextStage(current) !== null;
}
