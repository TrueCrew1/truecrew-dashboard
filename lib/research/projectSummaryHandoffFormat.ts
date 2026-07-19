export interface WorkflowProjectContext {
  id: string;
  title: string;
  type: string;
  stage: string;
  owner: string;
  summary: string;
  tasks: Array<{
    id: string;
    title: string;
    stage: string;
    workflowType: string;
    priority: string;
    blocker?: string;
    summary?: string;
  }>;
}

export interface ParsedHandoffContent {
  operationalSummary: string;
  keyRisks: string[];
  openQuestions: string[];
  buildHandoffNotes: string;
  recommendedNextBuildStep: string;
}

export function buildProjectSummaryHandoffPrompt(project: WorkflowProjectContext): string {
  const taskLines =
    project.tasks.length > 0
      ? project.tasks
          .map(
            (task) =>
              `- ${task.id}: ${task.title} (stage: ${task.stage}, priority: ${task.priority})${
                task.blocker ? ` — blocker: ${task.blocker}` : ""
              }`,
          )
          .join("\n")
      : "- (no linked tasks)";

  return `You are the Research agent for True Crew, an operations command center for field maintenance teams.

Produce a project operational summary and build handoff for the workflow below.
Respond with JSON only — no markdown fences, no commentary.

Required JSON shape:
{
  "operationalSummary": "string",
  "keyRisks": ["string"],
  "openQuestions": ["string"],
  "buildHandoffNotes": "string",
  "recommendedNextBuildStep": "string"
}

Project workflow:
- id: ${project.id}
- title: ${project.title}
- type: ${project.type}
- stage: ${project.stage}
- owner: ${project.owner}
- summary: ${project.summary}

Linked tasks:
${taskLines}
`.trim();
}

export function parseHandoffContent(raw: string): ParsedHandoffContent {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("LLM response was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM response JSON must be an object");
  }

  const record = parsed as Record<string, unknown>;
  const operationalSummary = String(record.operationalSummary ?? "").trim();
  const buildHandoffNotes = String(record.buildHandoffNotes ?? "").trim();
  const recommendedNextBuildStep = String(record.recommendedNextBuildStep ?? "").trim();

  if (!operationalSummary || !buildHandoffNotes || !recommendedNextBuildStep) {
    throw new Error("LLM response missing required summary fields");
  }

  const keyRisks = Array.isArray(record.keyRisks)
    ? record.keyRisks.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const openQuestions = Array.isArray(record.openQuestions)
    ? record.openQuestions.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    operationalSummary,
    keyRisks,
    openQuestions,
    buildHandoffNotes,
    recommendedNextBuildStep,
  };
}

export function renderProjectSummaryHandoffNote(input: {
  project: WorkflowProjectContext;
  handoff: ParsedHandoffContent;
  proposalId: string;
  missionId: string;
}): string {
  const { project, handoff, proposalId, missionId } = input;
  const risks =
    handoff.keyRisks.length > 0
      ? handoff.keyRisks.map((risk) => `- ${risk}`).join("\n")
      : "- (none identified)";
  const questions =
    handoff.openQuestions.length > 0
      ? handoff.openQuestions.map((q) => `- ${q}`).join("\n")
      : "- (none identified)";

  return `---
type: project-summary-handoff
mission_kind: research:project-summary-handoff
project_id: ${project.id}
proposal_id: ${proposalId}
mission_id: ${missionId}
generated_at: ${new Date().toISOString()}
---

# Project Summary Handoff — ${project.title}

## Operational summary

${handoff.operationalSummary}

## Key risks

${risks}

## Open questions

${questions}

## Build handoff notes

${handoff.buildHandoffNotes}

## Recommended next build step

${handoff.recommendedNextBuildStep}
`;
}

export function handoffNotePath(projectTitle: string): string {
  const safe = projectTitle.replace(/[\\/:*?"<>|]/g, "-").trim();
  return `Operations/Handoffs/Project Summary Handoff — ${safe}.md`;
}

export function handoffArtifactJsonPath(missionId: string): string {
  return `Operations/Handoffs/${missionId}.json`;
}
