import { runTask } from "../llm/index.js";
import type { WorkflowProjectContext } from "./projectSummaryHandoffFormat.js";
import { fetchWorkflowProjectContext as fetchWorkflowProjectContextRow } from "../supabase/queries.js";
import { isVaultConfigured } from "../obsidian/config.js";
import { logBuild } from "../obsidian/log.js";
import { writeVaultNote } from "../obsidian/write.js";
import {
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
  type BuildHandoffArtifact,
  type MissionStatus,
  type ProjectSummaryHandoffMission,
} from "../missions/types.js";
import {
  readProjectSummaryHandoffMissionByProposal,
  saveProjectSummaryHandoffMission,
} from "../missions/projectSummaryHandoffStore.js";
import {
  buildProjectSummaryHandoffPrompt,
  handoffArtifactJsonPath,
  handoffNotePath,
  parseHandoffContent,
  renderProjectSummaryHandoffNote,
} from "./projectSummaryHandoffFormat.js";

function mapWorkflowProjectContext(
  row: Awaited<ReturnType<typeof fetchWorkflowProjectContextRow>>,
): WorkflowProjectContext {
  if (!row) throw new Error("Expected workflow row");
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    stage: row.stage,
    owner: row.owner,
    summary: row.summary,
    tasks: row.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      stage: task.stage,
      workflowType: task.workflowType,
      priority: task.priority,
      blocker: task.blocker ?? undefined,
      summary: task.description,
    })),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

async function failMission(
  mission: ProjectSummaryHandoffMission,
  status: Extract<MissionStatus, "failed" | "blocked">,
  error: string,
): Promise<ProjectSummaryHandoffMission> {
  const updated: ProjectSummaryHandoffMission = {
    ...mission,
    status,
    error,
    completedAt: nowIso(),
    updatedAt: nowIso(),
  };
  await saveProjectSummaryHandoffMission(updated);
  return updated;
}

export interface ExecuteProjectSummaryHandoffInput {
  proposalId: string;
  projectId: string;
}

export async function executeProjectSummaryHandoff(
  input: ExecuteProjectSummaryHandoffInput,
): Promise<ProjectSummaryHandoffMission> {
  const existing = readProjectSummaryHandoffMissionByProposal(input.proposalId);
  if (existing?.status === "completed") {
    return existing;
  }
  if (existing?.status === "running") {
    return existing;
  }

  let mission: ProjectSummaryHandoffMission = existing ?? {
    id: `psh-${Date.now()}`,
    kind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    status: "queued",
    proposalId: input.proposalId,
    projectId: input.projectId,
    projectTitle: "",
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
  await saveProjectSummaryHandoffMission(mission);

  if (!isVaultConfigured()) {
    return failMission(mission, "blocked", "Obsidian vault is not configured");
  }

  let project;
  try {
    const row = await fetchWorkflowProjectContextRow(input.projectId);
    project = row ? mapWorkflowProjectContext(row) : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Supabase unavailable";
    return failMission(mission, "blocked", message);
  }

  if (!project) {
    return failMission(mission, "failed", `Project not found: ${input.projectId}`);
  }

  mission = { ...mission, projectTitle: project.title };
  await saveProjectSummaryHandoffMission(mission);

  let llmText: string;
  try {
    const result = await runTask({
      lane: "research",
      complexity: "medium",
      prompt: buildProjectSummaryHandoffPrompt(project),
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
    parsed = parseHandoffContent(llmText);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM response was not valid JSON";
    return failMission(mission, "blocked", message);
  }

  const outputNotePath = handoffNotePath(project.title);
  const handoffArtifactPath = handoffArtifactJsonPath(mission.id);
  const generatedAt = nowIso();

  const handoff: BuildHandoffArtifact = {
    missionId: mission.id,
    projectId: project.id,
    projectTitle: project.title,
    summary: parsed.operationalSummary,
    risks: parsed.keyRisks,
    openQuestions: parsed.openQuestions,
    recommendedNextBuildStep: parsed.recommendedNextBuildStep,
    buildHandoffNotes: parsed.buildHandoffNotes,
    generatedAt,
    proposalId: input.proposalId,
  };

  const noteBody = renderProjectSummaryHandoffNote({
    project,
    handoff: parsed,
    proposalId: input.proposalId,
    missionId: mission.id,
  });

  try {
    await writeVaultNote(outputNotePath, noteBody);
    await writeVaultNote(handoffArtifactPath, `${JSON.stringify(handoff, null, 2)}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Obsidian write failed";
    return failMission(mission, "blocked", message);
  }

  try {
    await logBuild({
      result: "success",
      notes: [
        `Project summary handoff — ${project.title}`,
        `Mission kind: ${RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND}`,
        `Mission id: ${mission.id}`,
        `Project id: ${project.id}`,
        `Proposal id: ${input.proposalId}`,
        `Output note: ${outputNotePath}`,
        `Artifact: ${handoffArtifactPath}`,
        `Recommended next build step: ${parsed.recommendedNextBuildStep}`,
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

  const completed: ProjectSummaryHandoffMission = {
    ...mission,
    status: "completed",
    projectTitle: project.title,
    outputNotePath,
    handoffArtifactPath,
    handoff,
    completedAt: nowIso(),
    updatedAt: nowIso(),
    error: undefined,
  };
  await saveProjectSummaryHandoffMission(completed);
  return completed;
}
