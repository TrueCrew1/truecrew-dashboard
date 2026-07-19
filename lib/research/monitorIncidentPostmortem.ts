import { runTask } from "../llm/index.js";
import type { IncidentPostmortemContext } from "./monitorIncidentPostmortemFormat.js";
import { fetchIncidentContext as fetchIncidentContextRow } from "../supabase/queries.js";
import { isVaultConfigured } from "../obsidian/config.js";
import { logBuild } from "../obsidian/log.js";
import { writeVaultNote } from "../obsidian/write.js";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  type MissionStatus,
  type MonitorIncidentPostmortemArtifact,
  type MonitorIncidentPostmortemMission,
} from "../missions/types.js";
import {
  readMonitorIncidentPostmortemMissionByProposal,
  saveMonitorIncidentPostmortemMission,
} from "../missions/monitorIncidentPostmortemStore.js";
import {
  buildMonitorIncidentPostmortemPrompt,
  parsePostmortemContent,
  postmortemArtifactJsonPath,
  postmortemNotePath,
  renderMonitorIncidentPostmortemNote,
} from "./monitorIncidentPostmortemFormat.js";
import { scheduleGovernedMissionSlack } from "../governedLoopSlack.js";

function mapIncidentContext(
  row: Awaited<ReturnType<typeof fetchIncidentContextRow>>,
): IncidentPostmortemContext {
  if (!row) throw new Error("Expected incident row");
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    serviceName: row.serviceName,
    summary: row.summary,
    openedAt: row.openedAt,
    mitigatedAt: row.mitigatedAt,
    resolvedAt: row.resolvedAt,
    linkedRepairId: row.linkedRepairId,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

async function failMission(
  mission: MonitorIncidentPostmortemMission,
  status: Extract<MissionStatus, "failed" | "blocked">,
  error: string,
): Promise<MonitorIncidentPostmortemMission> {
  const updated: MonitorIncidentPostmortemMission = {
    ...mission,
    status,
    error,
    completedAt: nowIso(),
    updatedAt: nowIso(),
  };
  await saveMonitorIncidentPostmortemMission(updated);
  scheduleGovernedMissionSlack(updated);
  return updated;
}

export interface ExecuteMonitorIncidentPostmortemInput {
  proposalId: string;
  incidentId: string;
}

export async function executeMonitorIncidentPostmortem(
  input: ExecuteMonitorIncidentPostmortemInput,
): Promise<MonitorIncidentPostmortemMission> {
  const existing = readMonitorIncidentPostmortemMissionByProposal(input.proposalId);
  if (existing?.status === "completed") {
    return existing;
  }
  if (existing?.status === "running") {
    return existing;
  }

  let mission: MonitorIncidentPostmortemMission = existing ?? {
    id: `mip-${Date.now()}`,
    kind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
    status: "queued",
    proposalId: input.proposalId,
    incidentId: input.incidentId,
    incidentTitle: "",
    serviceName: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  mission = {
    ...mission,
    status: "running",
    startedAt: nowIso(),
    updatedAt: nowIso(),
    error: undefined,
  };
  await saveMonitorIncidentPostmortemMission(mission);
  scheduleGovernedMissionSlack(mission);

  if (!isVaultConfigured()) {
    return failMission(mission, "blocked", "Obsidian vault is not configured");
  }

  let incident;
  try {
    const row = await fetchIncidentContextRow(input.incidentId);
    incident = row ? mapIncidentContext(row) : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Supabase unavailable";
    return failMission(mission, "blocked", message);
  }

  if (!incident) {
    return failMission(mission, "failed", `Incident not found: ${input.incidentId}`);
  }

  mission = {
    ...mission,
    incidentTitle: incident.title,
    serviceName: incident.serviceName,
  };
  await saveMonitorIncidentPostmortemMission(mission);

  let llmText: string;
  try {
    const result = await runTask({
      lane: "research",
      complexity: "medium",
      prompt: buildMonitorIncidentPostmortemPrompt(incident),
    });
    llmText = result.text.trim();
    if (!llmText) {
      return failMission(mission, "blocked", "LLM returned empty output");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM unavailable";
    return failMission(mission, "blocked", message);
  }

  let parsed;
  try {
    parsed = parsePostmortemContent(llmText);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM response was not valid JSON";
    return failMission(mission, "blocked", message);
  }

  const outputNotePath = postmortemNotePath(incident.title);
  const handoffArtifactPath = postmortemArtifactJsonPath(mission.id);
  const generatedAt = nowIso();

  const postmortem: MonitorIncidentPostmortemArtifact = {
    missionId: mission.id,
    incidentId: incident.id,
    incidentTitle: incident.title,
    serviceName: incident.serviceName,
    summary: parsed.incidentSummary,
    likelyCauses: parsed.likelyCauses,
    impacts: parsed.impacts,
    recommendedActions: parsed.recommendedActions,
    followUpNotes: parsed.followUpNotes,
    generatedAt,
    proposalId: input.proposalId,
  };

  const noteBody = renderMonitorIncidentPostmortemNote({
    incident,
    postmortem: parsed,
    proposalId: input.proposalId,
    missionId: mission.id,
  });

  try {
    await writeVaultNote(outputNotePath, noteBody);
    await writeVaultNote(handoffArtifactPath, `${JSON.stringify(postmortem, null, 2)}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Obsidian write failed";
    return failMission(mission, "blocked", message);
  }

  try {
    await logBuild({
      result: "success",
      notes: [
        `Monitor incident postmortem — ${incident.title}`,
        `Mission kind: ${RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND}`,
        `Mission id: ${mission.id}`,
        `Incident id: ${incident.id}`,
        `Proposal id: ${input.proposalId}`,
        `Output note: ${outputNotePath}`,
        `Artifact: ${handoffArtifactPath}`,
      ].join("\n"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Build log write failed";
    return failMission(
      mission,
      "blocked",
      `Outputs saved but build log failed: ${message}`,
    );
  }

  const completed: MonitorIncidentPostmortemMission = {
    ...mission,
    status: "completed",
    outputNotePath,
    handoffArtifactPath,
    postmortem,
    completedAt: nowIso(),
    updatedAt: nowIso(),
    error: undefined,
  };
  await saveMonitorIncidentPostmortemMission(completed);
  scheduleGovernedMissionSlack(completed);
  return completed;
}
