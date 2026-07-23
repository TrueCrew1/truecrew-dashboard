/**
 * Project-scoped Obsidian note drafts for Chief.
 * Draft generation is client-safe; vault writes go through the gated adapter.
 */
import type { ProjectToolScope } from "@/data/projects";
import { notePathMatchesProjectPrefix } from "@/lib/chief/projectToolScopeFilters";

export interface ObsidianProjectNoteDraft {
  projectId: string;
  projectName: string;
  /** First configured Obsidian path prefix for the project. */
  scopePrefix: string;
  /** Proposed vault-relative path (must stay under scopePrefix). */
  targetPath: string;
  title: string;
  body: string;
  /** Short preview for UI (first ~280 chars of body). */
  preview: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "note";
}

function dateStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Pull a topic from a draft command; falls back to a generic title. */
export function extractObsidianDraftTopic(command: string): string {
  const cleaned = command
    .replace(/\b(draft|create|propose|prepare|new)\b/gi, " ")
    .replace(/\b(obsidian|vault|note|notes|for|this|project|about|on|a|an|the)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Chief project note";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function resolveObsidianDraftTargetPath(
  scopePrefix: string,
  title: string,
  now = new Date(),
): string {
  const prefix = scopePrefix.replace(/\\/g, "/").replace(/\/+$/, "");
  return `${prefix}/Chief Drafts/${dateStamp(now)}-${slugify(title)}.md`;
}

export function buildObsidianProjectNoteMarkdown(input: {
  title: string;
  projectName: string;
  projectId: string;
  command: string;
  now?: Date;
}): string {
  const stamp = (input.now ?? new Date()).toISOString();
  return [
    "---",
    `title: ${JSON.stringify(input.title)}`,
    "type: decision",
    `project_id: ${input.projectId}`,
    `project: ${JSON.stringify(input.projectName)}`,
    "agent: chief",
    `created_at: ${stamp}`,
    "status: draft",
    "---",
    "",
    `# ${input.title}`,
    "",
    `Project: **${input.projectName}**`,
    "",
    "Draft prepared by Chief. Not written to the vault until an operator approves.",
    "",
    "## Request",
    "",
    input.command.trim(),
    "",
    "## Notes",
    "",
    "- Fill in findings, decisions, and next actions here.",
    "",
  ].join("\n");
}

export function previewObsidianDraftBody(body: string, max = 280): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/**
 * Build a draft payload for the selected project. Returns null when no
 * Obsidian prefix is configured.
 */
export function buildObsidianProjectNoteDraft(input: {
  scope: ProjectToolScope;
  command: string;
  now?: Date;
}): ObsidianProjectNoteDraft | null {
  const scopePrefix = input.scope.obsidianPathPrefixes[0]?.trim();
  if (!scopePrefix) return null;

  const title = extractObsidianDraftTopic(input.command);
  const targetPath = resolveObsidianDraftTargetPath(scopePrefix, title, input.now);
  const body = buildObsidianProjectNoteMarkdown({
    title,
    projectName: input.scope.projectName,
    projectId: input.scope.projectId,
    command: input.command,
    now: input.now,
  });

  return {
    projectId: input.scope.projectId,
    projectName: input.scope.projectName,
    scopePrefix,
    targetPath,
    title,
    body,
    preview: previewObsidianDraftBody(body),
  };
}

/** True when the proposed path stays inside an allowed project prefix. */
export function isObsidianDraftPathInScope(
  targetPath: string,
  allowedPrefixes: readonly string[],
): boolean {
  return allowedPrefixes.some((prefix) => notePathMatchesProjectPrefix(targetPath, prefix));
}
