import { researchFindingNotePath } from "./paths.js";
import type {
  BuildLogEntry,
  DecisionLogEntry,
  HotContextEntry,
  MaintenanceLogEntry,
  PlanningLogEntry,
  PrLogEntry,
  ResearchFindingLogEntry,
} from "./types.js";

function formatTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function formatIso(date: Date): string {
  return date.toISOString();
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yamlFrontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

/**
 * Minimal governed-note frontmatter (see docs/SYSTEM_OF_RECORD.md § source_of_truth).
 * `owner` and `tags` have no real input source from the pipelines yet. `owner` is
 * emitted as YAML `null` (not a fabricated string like "unassigned") so it reads
 * unambiguously as "not yet set" rather than a real value; `tags` is emitted as a
 * real empty YAML list for the same reason.
 */
function governedFields(loggedAt: Date): Record<string, string> {
  return {
    status: "active",
    owner: "null",
    source_of_truth: "vault",
    last_reviewed: formatDate(loggedAt),
    tags: "[]",
  };
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
    ...governedFields(loggedAt),
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

export function renderMaintenanceNote(entry: MaintenanceLogEntry): string {
  const loggedAt = entry.loggedAt ?? new Date();
  const frontmatter = yamlFrontmatter({
    type: "maintenance",
    source: "true-crew",
    logged_at: formatIso(loggedAt),
    ...governedFields(loggedAt),
  });

  const sections = [`# ${entry.title}`, ""];
  if (entry.context) {
    sections.push("## Context", "", entry.context, "");
  }
  sections.push("## Description", "", entry.description, "");
  if (entry.notes) {
    sections.push("## Notes", "", entry.notes, "");
  }

  return frontmatter + sections.join("\n");
}

export function renderPlanningNote(entry: PlanningLogEntry): string {
  const loggedAt = entry.loggedAt ?? new Date();
  const frontmatter = yamlFrontmatter({
    type: "planning",
    source: "true-crew",
    logged_at: formatIso(loggedAt),
    ...governedFields(loggedAt),
  });

  const sections = [`# ${entry.title}`, ""];
  if (entry.context) {
    sections.push("## Context", "", entry.context, "");
  }
  sections.push("## Plan", "", entry.description, "");
  if (entry.notes) {
    sections.push("## Notes", "", entry.notes, "");
  }

  return frontmatter + sections.join("\n");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Research Finding Intake note — one file per finding, filed under Research/.
 * Field set and order mirror docs/OBSIDIAN_RESEARCH_INTAKE.md's fixed-field
 * template exactly, so the note is recognizable as the same shape regardless
 * of where a finding ends up being filed. The `ID`'s `NN` suffix is fixed at
 * `01` here — same-day dedupe across multiple findings is a filing-clerk
 * judgment call per that doc, not something this renderer automates.
 */
export function renderResearchFindingNote(entry: ResearchFindingLogEntry): string {
  const loggedAt = entry.loggedAt ?? new Date();
  const tier = entry.tier ?? "Log";
  const date = formatDate(loggedAt);
  const slug = slugify(entry.title) || "finding";
  const destination = researchFindingNotePath(entry.title, loggedAt);

  const frontmatter = yamlFrontmatter({
    type: "research-finding",
    source: "true-crew",
    logged_at: formatIso(loggedAt),
    tier: tier.toLowerCase(),
    ...governedFields(loggedAt),
  });

  const lines = [
    `### Research Finding Intake — ${entry.title}`,
    `- ID: ${date}-${slug}-01`,
    `- Date: ${date}`,
    `- Agent: Research`,
    `- Source(s) checked: ${entry.sourcesChecked}`,
    `- Finding: ${entry.finding}`,
    `- Worked: ${entry.worked ?? "none"}`,
    `- Failed: ${entry.failed ?? "none"}`,
    `- Next time: ${entry.nextTime ?? "none"}`,
    `- Tier: ${tier}`,
    `- Dedupe check: ${entry.dedupeCheck ?? (tier === "Log" ? "n/a for Log tier" : "none")}`,
    `- Destination: Obsidian — ${destination}`,
    `- Related approval request: ${entry.relatedApprovalRequest ?? "none"}`,
    `- Related PR: ${entry.relatedPr ?? "none"}`,
    "",
  ];

  return frontmatter + lines.join("\n");
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
