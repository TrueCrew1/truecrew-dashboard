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

function yamlArrayLiteral(values: readonly string[]): string {
  return `[${values.join(", ")}]`;
}

function yamlQuotedWikilinks(titles: readonly string[]): string {
  return `[${titles.map((title) => `"[[${title}]]"`).join(", ")}]`;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
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

/** Renders a Knowledge Architecture V1 Template 1 decision note. */
export function renderDecisionNote(entry: DecisionLogEntry): string {
  const loggedAt = entry.loggedAt ?? new Date();
  const tags = entry.tags?.length ? entry.tags : ["truecrew"];
  const status = entry.status ?? "active";
  const related = (entry.related ?? []).slice(0, 3);

  const frontmatter = yamlFrontmatter({
    type: "decision",
    status,
    tags: yamlArrayLiteral(tags),
    created: formatDateOnly(loggedAt),
    summary: entry.summary,
    related: related.length ? yamlQuotedWikilinks(related) : "[]",
  });

  const sections = [`# ${entry.title}`, ""];
  if (entry.context) {
    sections.push("## Context", "", entry.context, "");
  }
  sections.push("## Decision", "", entry.decision, "");
  if (entry.alternatives) {
    sections.push("## Alternatives considered", "", entry.alternatives, "");
  }
  if (entry.impact) {
    sections.push("## Impact / risk", "", entry.impact, "");
  }
  if (entry.followUps) {
    sections.push("## Follow-ups", "", entry.followUps, "");
  }
  sections.push(
    "## Links",
    "",
    related.length ? related.map((title) => `- [[${title}]]`).join("\n") : "_(none yet)_",
    "",
  );

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
