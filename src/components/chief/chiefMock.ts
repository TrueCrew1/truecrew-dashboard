import type {
  ApprovalProposal,
  ChiefResponse,
  CommandHistoryEntry,
  CommandHistoryStatus,
} from "./types";

export function nextChiefId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
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

export function buildApprovalFromResponse(
  command: string,
  response: ChiefResponse,
): ApprovalProposal | null {
  if (!response.approvalNeeded) return null;

  return {
    id: nextChiefId("apr"),
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
