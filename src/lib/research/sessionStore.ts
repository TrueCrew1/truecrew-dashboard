import { loadSessionState, saveSessionState } from "@/components/chief/chiefSessionStorage";
import type { ResearchRequest } from "./types";

const SESSION_RESEARCH_STORAGE_KEY = "research.sessionRequests.v1";

function slugifyTopic(topic: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "topic";
}

function isResearchRequest(value: unknown): value is ResearchRequest {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.topic === "string" &&
    typeof row.whyItMatters === "string" &&
    typeof row.suggestedOutcome === "string" &&
    typeof row.createdAt === "string" &&
    (row.source === "session" || row.source === "adapter")
  );
}

function isResearchRequestArray(value: unknown): value is ResearchRequest[] {
  return Array.isArray(value) && value.every(isResearchRequest);
}

export function loadSessionResearchRequests(): ResearchRequest[] {
  const stored =
    loadSessionState(SESSION_RESEARCH_STORAGE_KEY, isResearchRequestArray) ?? [];
  return stored.filter((row) => row.source === "session");
}

export function saveSessionResearchRequests(requests: ResearchRequest[]): void {
  saveSessionState(SESSION_RESEARCH_STORAGE_KEY, requests);
}

/** Operator-issued research from the command bar — browser session only, not live API. */
export function buildSessionResearchRequest(topic: string): ResearchRequest {
  const trimmed = topic.trim();
  const now = new Date().toISOString();
  return {
    id: `req-session-${slugifyTopic(trimmed)}-${Date.now()}`,
    topic: trimmed,
    whyItMatters: `Operator command — research on "${trimmed}". Nothing auto-investigates this topic.`,
    suggestedOutcome:
      "File a findings note in knowledge/sources/ when investigation is complete.",
    createdAt: now,
    source: "session",
  };
}

export function mergeResearchRequests(
  sessionRequests: ResearchRequest[],
  adapterRequests: ResearchRequest[],
): ResearchRequest[] {
  return [...sessionRequests, ...adapterRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
