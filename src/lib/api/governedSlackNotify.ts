function internalAuthHeaders(): HeadersInit {
  const key = import.meta.env.VITE_INTERNAL_KEY;
  return key ? { "x-internal-key": key } : {};
}

function governedSlackFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: { ...internalAuthHeaders(), ...init.headers },
  });
}

const MONITOR_PLATFORM_APPROVAL_PREFIX = "apr-monitor-platform-";

function isGovernedChiefApproval(input: {
  proposalId: string;
  missionKind?: string;
}): boolean {
  if (input.missionKind) return true;
  return input.proposalId.startsWith(MONITOR_PLATFORM_APPROVAL_PREFIX);
}

function notifyGovernedSlack(body: Record<string, unknown>): void {
  void governedSlackFetch("/api/chief/governed-slack-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((error: unknown) => {
    console.warn(
      "Governed Slack notify failed",
      error instanceof Error ? error.message : error,
    );
  });
}

export function notifyGovernedApprovalCreated(input: {
  approvalId: string;
  missionKind?: string;
  missionProjectId?: string;
}): void {
  if (
    !isGovernedChiefApproval({
      proposalId: input.approvalId,
      missionKind: input.missionKind,
    })
  ) {
    return;
  }

  notifyGovernedSlack({
    event: "approval_created",
    approvalId: input.approvalId,
    missionKind: input.missionKind,
    missionProjectId: input.missionProjectId,
  });
}

export function notifyGovernedMonitorState(input: {
  state: string;
  probeId: string;
  incidentId?: string;
}): void {
  notifyGovernedSlack({
    event: "monitor_state",
    state: input.state,
    probeId: input.probeId,
    incidentId: input.incidentId,
  });
}
