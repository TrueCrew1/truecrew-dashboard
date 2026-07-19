export const RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND =
  "research:project-summary-handoff" as const;

export const RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND =
  "research:monitor-incident-postmortem" as const;

export type MissionKind =
  | typeof RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND
  | typeof RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND;

export type MissionStatus = "queued" | "running" | "completed" | "blocked" | "failed";

export interface BuildHandoffArtifact {
  projectId: string;
  projectTitle: string;
  summary: string;
  risks: string[];
  openQuestions: string[];
  recommendedNextBuildStep: string;
  buildHandoffNotes: string;
  generatedAt: string;
  proposalId: string;
  missionId: string;
}

export interface ProjectSummaryHandoffMission {
  id: string;
  kind: MissionKind;
  status: MissionStatus;
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
  handoff?: BuildHandoffArtifact;
}

export interface MonitorIncidentPostmortemArtifact {
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
}

export interface MonitorIncidentPostmortemMission {
  id: string;
  kind: typeof RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND;
  status: MissionStatus;
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
  postmortem?: MonitorIncidentPostmortemArtifact;
}
