/**
 * Chief work-truth labels — operator-facing honesty about what a result/card is.
 *
 * - executable: backed by real state AND approve launches a real mission/runner
 * - grounded: backed by real state, needs judgment, but no auto-execution path yet
 * - informational: advice/status only — must not look like an approval to execute
 * - stub: demo / example / historical seed — operator path must hide these by default
 */

export type ChiefWorkTruth = "executable" | "grounded" | "informational" | "stub";

export const CHIEF_WORK_TRUTH_LABEL: Record<ChiefWorkTruth, string> = {
  executable: "Executable",
  grounded: "Needs judgment",
  informational: "Informational",
  stub: "Stub / demo",
};

/** Research mission kinds that ChiefPanel can launch after approve. */
export const EXECUTABLE_MISSION_KINDS = new Set([
  "research:monitor-incident-postmortem",
  "research:project-summary-handoff",
]);

export function isExecutableMissionKind(missionKind: string | undefined): boolean {
  return Boolean(missionKind && EXECUTABLE_MISSION_KINDS.has(missionKind));
}

/**
 * Operator mode never shows stubs. Explicit opt-in only via
 * VITE_SHOW_CHIEF_STUB_APPROVALS=true (dev/test). Never default-on.
 */
export function areChiefStubApprovalsEnabled(): boolean {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SHOW_CHIEF_STUB_APPROVALS === "true") {
      return true;
    }
  } catch {
    // import.meta unavailable in some Node contexts
  }
  return process.env.VITE_SHOW_CHIEF_STUB_APPROVALS === "true";
}

export function isOperatorVisibleWorkTruth(truth: ChiefWorkTruth | undefined): boolean {
  const resolved = truth ?? "grounded";
  if (resolved === "stub") return areChiefStubApprovalsEnabled();
  if (resolved === "informational") return false;
  return true;
}

/**
 * Downgrade fake or incomplete "approval" claims on command results.
 * Executable requires a known missionKind; otherwise strip approval flags.
 */
export function guardCommandResultWorkTruth<
  T extends {
    approvalNeeded?: boolean;
    approvalTitle?: string;
    approvalPrompt?: string;
    missionKind?: string;
    missionProjectId?: string;
    workTruth?: ChiefWorkTruth;
  },
>(result: T): T {
  const hasMission =
    isExecutableMissionKind(result.missionKind) && Boolean(result.missionProjectId);

  if (hasMission) {
    return { ...result, workTruth: "executable", approvalNeeded: true };
  }

  if (result.workTruth === "stub") {
    return {
      ...result,
      approvalNeeded: false,
      approvalTitle: undefined,
      approvalPrompt: undefined,
      missionKind: undefined,
      missionProjectId: undefined,
    };
  }

  // Anything that claimed approvalNeeded without a mission is not executable.
  if (result.approvalNeeded) {
    return {
      ...result,
      workTruth: result.workTruth === "grounded" ? "grounded" : "informational",
      approvalNeeded: false,
      approvalTitle: undefined,
      approvalPrompt: undefined,
      missionKind: undefined,
      missionProjectId: undefined,
    };
  }

  return {
    ...result,
    workTruth: result.workTruth ?? "informational",
  };
}
