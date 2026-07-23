import { loadSessionState, saveSessionState } from "@/components/chief/chiefSessionStorage";
import {
  canTransitionResearchStatus,
  researchStatusChangeError,
  RESEARCH_STATUS_VALUES,
} from "../../../lib/research/status";
import {
  MS_ESTIMATING_ROADMAP_FINDING_PATH,
  type ResearchRequest,
  type ResearchRequestStatus,
} from "./types";

// Transition rules live in lib/research/status.ts — shared with the API route
// so client and server can never disagree on the vocabulary.
export { canTransitionResearchStatus };

const SESSION_RESEARCH_STORAGE_KEY = "research.sessionRequests.v2";
const LEGACY_SESSION_RESEARCH_STORAGE_KEY = "research.sessionRequests.v1";

const STATUS_VALUES: ReadonlySet<string> = new Set(RESEARCH_STATUS_VALUES);

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
    typeof row.updatedAt === "string" &&
    (row.source === "session" || row.source === "adapter") &&
    typeof row.status === "string" &&
    STATUS_VALUES.has(row.status) &&
    (row.filedPath === undefined || typeof row.filedPath === "string") &&
    (row.blockerNote === undefined || typeof row.blockerNote === "string")
  );
}

function isResearchRequestArray(value: unknown): value is ResearchRequest[] {
  return Array.isArray(value) && value.every(isResearchRequest);
}

function migrateLegacyRow(raw: unknown): ResearchRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.topic !== "string" ||
    typeof row.whyItMatters !== "string" ||
    typeof row.suggestedOutcome !== "string" ||
    typeof row.createdAt !== "string" ||
    (row.source !== "session" && row.source !== "adapter")
  ) {
    return null;
  }

  const statusRaw = row.status;
  const updatedAtRaw = row.updatedAt;
  return {
    id: row.id,
    topic: row.topic,
    whyItMatters: row.whyItMatters,
    suggestedOutcome: row.suggestedOutcome,
    createdAt: row.createdAt,
    updatedAt: typeof updatedAtRaw === "string" ? updatedAtRaw : row.createdAt,
    source: row.source,
    status:
      typeof statusRaw === "string" && STATUS_VALUES.has(statusRaw)
        ? (statusRaw as ResearchRequestStatus)
        : "queued",
    filedPath: typeof row.filedPath === "string" ? row.filedPath : undefined,
    blockerNote: typeof row.blockerNote === "string" ? row.blockerNote : undefined,
  };
}

export function loadSessionResearchRequests(): ResearchRequest[] {
  const stored = loadSessionState(SESSION_RESEARCH_STORAGE_KEY, isResearchRequestArray);
  if (stored) return stored.filter((row) => row.source === "session");

  const legacy = loadSessionState(LEGACY_SESSION_RESEARCH_STORAGE_KEY, (value): value is unknown[] =>
    Array.isArray(value),
  );
  if (!legacy) return [];
  return legacy
    .map((row) => migrateLegacyRow(row))
    .filter((row): row is ResearchRequest => row !== null && row.source === "session");
}

export function saveSessionResearchRequests(requests: ResearchRequest[]): void {
  saveSessionState(SESSION_RESEARCH_STORAGE_KEY, requests);
}

export function isMsEstimatingRoadmapTopic(topic: string): boolean {
  return /m\s*&\s*s|ms[\s-]?painting/i.test(topic) && /estimat/i.test(topic);
}

/**
 * Any M&S Painting research request — broader than the estimating-roadmap
 * check above. Single source of truth for "does this belong to the M&S
 * Painting Chief context", shared by MsResearchStatusCard (display) and
 * researchStartApprovals (which context's approval board shows the card).
 */
export function isMsPaintingResearchRequest(request: ResearchRequest): boolean {
  return (
    /m\s*&\s*s|ms[\s-]?painting/i.test(request.topic) ||
    Boolean(request.filedPath?.includes("knowledge/findings/m-and-s/"))
  );
}

/** Operator-issued research from the command bar — browser session only, not live API. */
export function buildSessionResearchRequest(topic: string): ResearchRequest {
  const trimmed = topic.trim();
  const now = new Date().toISOString();
  const estimating = isMsEstimatingRoadmapTopic(trimmed);
  return {
    id: `req-session-${slugifyTopic(trimmed)}-${Date.now()}`,
    topic: trimmed,
    whyItMatters: estimating
      ? "V1 live-readiness slice — M&S estimating roadmap research. Operator-driven; nothing auto-investigates."
      : `Operator command — research on "${trimmed}". Nothing auto-investigates this topic.`,
    suggestedOutcome: estimating
      ? `File findings under ${MS_ESTIMATING_ROADMAP_FINDING_PATH} when investigation is complete.`
      : "File a findings note under knowledge/findings/m-and-s/ or knowledge/sources/ when complete.",
    createdAt: now,
    updatedAt: now,
    source: "session",
    status: "queued",
  };
}

export function applyResearchStatus(
  request: ResearchRequest,
  next: ResearchRequestStatus,
  options?: { filedPath?: string; blockerNote?: string },
): ResearchRequest {
  const validationError = researchStatusChangeError(request.status, next, {
    filedPath: options?.filedPath ?? request.filedPath,
    blockerNote: options?.blockerNote ?? request.blockerNote,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  const now = new Date().toISOString();
  return {
    ...request,
    status: next,
    updatedAt: now,
    filedPath: next === "done" ? (options?.filedPath ?? request.filedPath) : request.filedPath,
    blockerNote:
      next === "blocked" ? (options?.blockerNote ?? request.blockerNote) : request.blockerNote,
  };
}

export function defaultFiledPathForTopic(topic: string): string {
  if (isMsEstimatingRoadmapTopic(topic)) return MS_ESTIMATING_ROADMAP_FINDING_PATH;
  return "knowledge/findings/m-and-s/";
}

export function mergeResearchRequests(
  sessionRequests: ResearchRequest[],
  adapterRequests: ResearchRequest[],
): ResearchRequest[] {
  return [...sessionRequests, ...adapterRequests].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
