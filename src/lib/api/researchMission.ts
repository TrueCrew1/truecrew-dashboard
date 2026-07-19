import { RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND } from "../../../lib/missions/types";
import { isLiveApiEnabled } from "./client";

export interface ProjectSummaryHandoffMissionPayload {
  id: string;
  kind: typeof RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND;
  status: "queued" | "running" | "completed" | "blocked" | "failed";
  projectId: string;
  projectTitle: string;
  proposalId: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  outputNotePath?: string;
  handoffArtifactPath?: string;
  handoff?: {
    missionId: string;
    projectId: string;
    projectTitle: string;
    summary: string;
    risks: string[];
    openQuestions: string[];
    recommendedNextBuildStep: string;
    buildHandoffNotes: string;
    generatedAt: string;
    proposalId: string;
  };
}

function internalAuthHeaders(): HeadersInit {
  const key = import.meta.env.VITE_INTERNAL_KEY;
  return key ? { "x-internal-key": key } : {};
}

function researchMissionFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: { ...internalAuthHeaders(), ...init.headers },
  });
}

export async function fetchProjectSummaryHandoffMissions(): Promise<
  ProjectSummaryHandoffMissionPayload[]
> {
  const response = await researchMissionFetch("/api/research/project-summary-handoff");
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    missions?: ProjectSummaryHandoffMissionPayload[];
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Project summary handoff API returned ${response.status}`);
  }

  return body.missions ?? [];
}

export async function fetchProjectSummaryHandoffMissionByProposal(
  proposalId: string,
): Promise<ProjectSummaryHandoffMissionPayload | null> {
  const response = await researchMissionFetch(
    `/api/research/project-summary-handoff?proposalId=${encodeURIComponent(proposalId)}`,
  );
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    mission?: ProjectSummaryHandoffMissionPayload;
  };

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(body.error ?? `Project summary handoff API returned ${response.status}`);
  }

  return body.mission ?? null;
}

export async function executeProjectSummaryHandoffMission(input: {
  proposalId: string;
  projectId: string;
}): Promise<ProjectSummaryHandoffMissionPayload> {
  const response = await researchMissionFetch("/api/research/project-summary-handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proposalId: input.proposalId,
      projectId: input.projectId,
      missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    mission?: ProjectSummaryHandoffMissionPayload;
  };

  if (!body.mission) {
    throw new Error(body.error ?? `Project summary handoff API returned ${response.status}`);
  }

  return body.mission;
}

export function canRunProjectSummaryHandoffMissions(): boolean {
  return isLiveApiEnabled();
}
