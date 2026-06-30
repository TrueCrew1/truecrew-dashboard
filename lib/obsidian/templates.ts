import type {
  BuildLogEntry,
  DecisionLogEntry,
  HotContextEntry,
  PrLogEntry,
} from "./types.js";

function formatTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function formatIso(date: Date): string {
  return date.toISOString();
}

function yamlFrontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

export function renderBuildLogSection(entry: BuildLogEntry): string {
  const loggedAt = entry.loggedAt ?? new Date();
  const headline = [
    formatTimestamp(loggedAt),
    entry.branch ? `@ ${entry.branch}` : null,
    entry.commit ? `(${entry.commit.slice(0, 7)})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const lines = [`## ${headline}`, "", `- **Result:** ${entry.result}`];
  if (entry.notes) lines.push(`- **Notes:** ${entry.notes}`);
  lines.push("", "---", "");

  return lines.join("\n");
}

export function renderBuildLogSeed(): string {
  return yamlFrontmatter({
    type: "build-log",
    source: "true-crew",
    created_at: formatIso(new Date()),
  });
}

export function renderPrLogSection(entry: PrLogEntry): string {
  const loggedAt = entry.loggedAt ?? new Date();
  const lines = [
    `## ${formatTimestamp(loggedAt)} — PR #${entry.number}: ${entry.title}`,
    "",
    `- **Status:** ${entry.status}`,
  ];
  if (entry.url) lines.push(`- **URL:** ${entry.url}`);
  if (entry.notes) lines.push(`- **Notes:** ${entry.notes}`);
  lines.push("", "---", "");

  return lines.join("\n");
}

export function renderPrLogSeed(): string {
  return yamlFrontmatter({
    type: "pr-log",
    source: "true-crew",
    created_at: formatIso(new Date()),
  });
}

export function renderDecisionNote(entry: DecisionLogEntry): string {
  const loggedAt = entry.loggedAt ?? new Date();
  const frontmatter = yamlFrontmatter({
    type: "decision",
    source: "true-crew",
    logged_at: formatIso(loggedAt),
  });

  const sections = [`# ${entry.title}`, ""];
  if (entry.context) {
    sections.push("## Context", "", entry.context, "");
  }
  sections.push("## Decision", "", entry.decision, "");
  if (entry.consequences) {
    sections.push("## Consequences", "", entry.consequences, "");
  }

  return frontmatter + sections.join("\n");
}

export function renderHotContextNote(entry: HotContextEntry): string {
  const loggedAt = entry.loggedAt ?? new Date();
  const frontmatter = yamlFrontmatter({
    type: "hot-context",
    source: "true-crew",
    updated_at: formatIso(loggedAt),
  });

  return `${frontmatter}# Hot Context\n\n${entry.body.trim()}\n`;
}
