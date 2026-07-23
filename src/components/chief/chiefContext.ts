/**
 * Chief's active-context model: which job Chief is currently operating in.
 * Real state — see ChiefContextProvider.tsx and chiefContextScope.ts.
 *
 * Policy: docs/agents/CHIEF_OPERATING_SYSTEM.md
 * - Dropdown = Global + every app project from `src/data/projects.ts`
 *   (known catalog + ids discovered on Task/Workflow.projectId).
 * - Global = non-project / cross-project only.
 * - Project selection = tools/context (GitHub, Obsidian) stay inside that project.
 *
 * Project inventory SoT: `deriveAppProjects` / `KNOWN_APP_PROJECTS` — not a
 * Chief-only hardcode of M&S.
 */
import {
  deriveAppProjects,
  getProjectToolScope,
  listKnownAppProjects,
  type AppProject,
  type ProjectToolScope,
  type ProjectWorkSlice,
} from "@/data/projects";

/** `"global"` or any app project id from the inventory. */
export type ChiefContextId = string;

export interface ChiefContextDefinition {
  id: ChiefContextId;
  label: string;
  shortLabel: string;
  kind: "global" | "project";
  description: string;
}

export const GLOBAL_CHIEF_CONTEXT_ID = "global";
export const DEFAULT_CHIEF_CONTEXT: ChiefContextId = GLOBAL_CHIEF_CONTEXT_ID;

export const GLOBAL_CHIEF_CONTEXT: ChiefContextDefinition = {
  id: GLOBAL_CHIEF_CONTEXT_ID,
  label: "Global",
  shortLabel: "Global",
  kind: "global",
  description:
    "Non-project conversations and cross-project coordination only. Does not assume a project.",
};

function projectContextDefinition(project: AppProject): ChiefContextDefinition {
  return {
    id: project.id,
    label: project.name,
    shortLabel: project.name,
    kind: "project",
    description: `Project context. Tools and context (GitHub, Obsidian) stay inside ${project.name} unless you change the selection.`,
  };
}

/** Build Global-first dropdown options from the app project inventory. */
export function buildChiefContextList(projects: readonly AppProject[]): ChiefContextDefinition[] {
  return [GLOBAL_CHIEF_CONTEXT, ...projects.map(projectContextDefinition)];
}

export function buildChiefContextsMap(
  projects: readonly AppProject[],
): Record<string, ChiefContextDefinition> {
  const list = buildChiefContextList(projects);
  return Object.fromEntries(list.map((context) => [context.id, context]));
}

/**
 * Resolve projects for Chief from app data (mock or live). Falls back to the
 * known catalog when the work slice is empty.
 */
export function resolveChiefProjects(data?: ProjectWorkSlice | null): AppProject[] {
  if (!data) return listKnownAppProjects();
  const derived = deriveAppProjects(data);
  return derived.length > 0 ? derived : listKnownAppProjects();
}

/** Static snapshot from known catalog — tests / SSR fallback before data loads. */
export const CHIEF_CONTEXT_LIST: ChiefContextDefinition[] = buildChiefContextList(
  listKnownAppProjects(),
);

export const CHIEF_CONTEXTS: Record<string, ChiefContextDefinition> = buildChiefContextsMap(
  listKnownAppProjects(),
);

export function isChiefContextId(
  value: string,
  known: readonly ChiefContextDefinition[] = CHIEF_CONTEXT_LIST,
): value is ChiefContextId {
  return known.some((context) => context.id === value);
}

export function getChiefContextDefinition(
  contextId: ChiefContextId,
  known: readonly ChiefContextDefinition[] = CHIEF_CONTEXT_LIST,
): ChiefContextDefinition {
  return known.find((context) => context.id === contextId) ?? GLOBAL_CHIEF_CONTEXT;
}

/** Short UI line clarifying what the active selection means. */
export function chiefContextScopeSummary(definition: ChiefContextDefinition): string {
  if (definition.kind === "global") {
    return "Non-project and cross-project only. Select a project to keep GitHub and Obsidian in that project.";
  }
  return `Tools and context stay in ${definition.shortLabel} (GitHub, Obsidian) unless you change project.`;
}

/**
 * Tool-routing scope for the selected project. Null when Global or unknown.
 * Consumers (future GitHub/Obsidian helpers) should read this instead of
 * hardcoding M&S paths.
 */
export function chiefProjectToolScope(
  contextId: ChiefContextId,
  projects: readonly AppProject[],
): ProjectToolScope | null {
  if (contextId === GLOBAL_CHIEF_CONTEXT_ID) return null;
  return getProjectToolScope(projects, contextId);
}
