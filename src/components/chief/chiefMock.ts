import type {
  ApprovalProposal,
  ChiefResponse,
  CommandHistoryEntry,
  CommandHistoryStatus,
} from "./types";

export function nextChiefId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** FNV-1a hash — used for stable proposal IDs (see buildApprovalFromResponse). */
export function stableChiefId(prefix: string, seed: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}-${hash.toString(16).padStart(8, "0")}`;
}

export function formatChiefTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today ${time}`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildHistoryEntry(
  command: string,
  response: ChiefResponse,
  status: CommandHistoryStatus = "completed",
): CommandHistoryEntry {
  return {
    id: nextChiefId("cmd"),
    command,
    timestamp: new Date().toISOString(),
    resultSummary: response.summary,
    status,
  };
}

// Command-generated approval IDs must be stable and deterministic.
// - Uses FNV-1a via stableChiefId("apr-cmd", seed) — no Math.random(), Date.now(), or index-based IDs.
// - Seed = command + approvalTitle so "same command, same context" → same proposal.id across reloads.
// - State maps and React keys are all keyed by proposal.id.
// - Command proposals use "apr-cmd-*" while derived ones use "apr-gate-*", "apr-alert-*", etc., so they never collide.
export function buildApprovalFromResponse(
  command: string,
  response: ChiefResponse,
): ApprovalProposal | null {
  if (!response.approvalNeeded) return null;

  return {
    id: stableChiefId("apr-cmd", `${command}|${response.approvalTitle ?? ""}`),
    title: response.approvalTitle ?? `Approval: ${command.slice(0, 48)}`,
    summary: response.summary,
    recommendedAction: response.recommendedAction,
    riskNote: response.riskNote ?? "Review recommended action before approving.",
    status: "pending",
    createdAt: new Date().toISOString(),
    specialist:
      response.routedTo !== "Chief"
        ? response.routedTo
        : response.specialists?.[0]?.specialist,
  };
}
