import type {
  ApprovalProposal,
  ChiefResponse,
  CommandHistoryEntry,
  CommandHistoryStatus,
} from "./types";
import { formatChiefReplyPlainText } from "./chiefReplyFormat";

export function nextChiefId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Deterministic ID for content-derived proposals (FNV-1a hash of seed).
 * The same command always produces the same proposal ID, so persisted
 * approval decisions survive reloads instead of orphaning against a
 * random UUID that never reappears.
 */
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
    resultSummary: formatChiefReplyPlainText(response),
    status,
  };
}

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
