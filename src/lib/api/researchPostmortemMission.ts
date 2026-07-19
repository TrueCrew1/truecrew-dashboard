import { RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND } from "../../../lib/missions/types";
import { isLiveApiEnabled } from "./client";

export interface MonitorIncidentPostmortemMissionPayload {
  id: string;
  kind: typeof RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND;
  status: "queued" | "running" | "completed" | "blocked" | "failed";
  incidentId: string;
  incidentTitle: string;
  serviceName: string;
  proposalId: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  outputNotePath?: string;
  handoffArtifactPath?: string;
  postmortem?: {
    missionId: string;
    incidentId: string;
    incidentTitle: string;
    serviceName: string;
    summary: string;
    likelyCauses: string[];
    impacts: string[];
    recommendedActions: string[];
    followUpNotes: string;
    generatedAt: string;
    proposalId: string;
  };
}

function internalAuthHeaders(): HeadersInit {
  const key = import.meta.env.VITE_INTERNAL_KEY;
  return key ? { "x-internal-key": key } : {};
}

function postmortemMissionFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: { ...internalAuthHeaders(), ...init.headers },
  });
}

export async function fetchMonitorIncidentPostmortemMissions(): Promise<
  MonitorIncidentPostmortemMissionPayload[]
> {
  const response = await postmortemMissionFetch("/api/research/monitor-incident-postmortem");
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    missions?: MonitorIncidentPostmortemMissionPayload[];
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Monitor incident postmortem API returned ${response.status}`);
  }

  return body.missions ?? [];
}

export async function executeMonitorIncidentPostmortemMission(input: {
  proposalId: string;
  incidentId: string;
}): Promise<MonitorIncidentPostmortemMissionPayload> {
  const response = await postmortemMissionFetch("/api/research/monitor-incident-postmortem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proposalId: input.proposalId,
      incidentId: input.incidentId,
      missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    mission?: MonitorIncidentPostmortemMissionPayload;
  };

  if (!body.mission) {
    throw new Error(body.error ?? `Monitor incident postmortem API returned ${response.status}`);
  }

  return body.mission;
}

export function canRunMonitorIncidentPostmortemMissions(): boolean {
  return isLiveApiEnabled();
}
