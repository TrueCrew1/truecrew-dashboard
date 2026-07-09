import type { Task } from "../../src/types";

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

export function renderMaintenanceNote(task: Task, targetPath: string): string {
  const frontmatter = yamlFrontmatter({
    type: "maintenance",
    source: "true-crew",
    agent: "maintenance",
    source_task_id: task.id,
    workflow_type: task.workflowType,
    stage: task.stage,
    obsidian_path: targetPath,
    tags: ["maintenance", "operations"],
  });

  const sections = [
    `# Maintenance — ${task.title}`,
    "",
    "## Work item",
    "",
    `- **Task:** ${task.title} (\`${task.id}\`)`,
    `- **Stage:** ${task.stage}`,
    `- **Type:** ${task.workflowType}`,
    `- **Priority:** ${task.priority}`,
  ];

  if (task.assignee) {
    sections.push(`- **Assignee:** ${task.assignee}`);
  }

  if (task.description?.trim()) {
    sections.push("", "## Notes", "", task.description.trim());
  }

  if (task.blocker?.trim()) {
    sections.push("", "## Blocker", "", task.blocker.trim());
  }

  return frontmatter + sections.join("\n") + "\n";
}
