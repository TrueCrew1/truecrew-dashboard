import type { WorkItem } from "./types";
import type { ArtifactDraft } from "./types";

function yamlFrontmatter(fields: Record<string, string | string[]>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

export function renderTaskArtifactNote(
  task: WorkItem,
  draft: ArtifactDraft,
  obsidianPath: string,
  refinementSource: "deterministic" | "ai",
): string {
  const frontmatter = yamlFrontmatter({
    type: draft.noteType,
    source: "true-crew",
    agent: "librarian",
    source_task_id: task.id,
    workflow_type: task.workflowType,
    stage: task.stage,
    refinement_source: refinementSource,
    obsidian_path: obsidianPath,
    tags: draft.tags,
    summary: draft.summary,
  });

  const sections = [
    `# ${draft.title}`,
    "",
    "## Summary",
    "",
    draft.summary,
    "",
    "## Work item",
    "",
    `- **Task:** ${task.title} (\`${task.id}\`)`,
    `- **Stage:** ${task.stage}`,
    `- **Type:** ${task.workflowType}`,
    `- **Priority:** ${task.priority}`,
  ];

  if (task.description?.trim()) {
    sections.push("", "## Description", "", task.description.trim());
  }

  if (task.blocker?.trim()) {
    sections.push("", "## Blocker", "", task.blocker.trim());
  }

  const openGates = task.gates.filter((g) => g.required && !g.passed);
  if (openGates.length > 0) {
    sections.push(
      "",
      "## Open gates",
      "",
      ...openGates.map((g) => `- ${g.label}`),
    );
  }

  if (task.githubRef) {
    sections.push("", "## GitHub", "", task.githubRef);
  }

  return frontmatter + sections.join("\n") + "\n";
}
