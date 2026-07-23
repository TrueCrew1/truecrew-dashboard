/**
 * App-level project inventory — intermediate source of truth for Chief’s
 * Project dropdown and (later) GitHub/Obsidian scoping.
 *
 * Today: explicit known projects + discovery from Task/Workflow.projectId
 * on app data (mock or live). Later: hydrate the same `AppProject` shape
 * from a Supabase `projects` table / `project_id` columns without rewriting
 * Chief UI contracts.
 *
 * Customers are not projects by default — only entries in this catalog or
 * ids already stamped on work records.
 */
import type { Customer, Task, Workflow } from "@/types";

export interface AppProject {
  id: string;
  name: string;
  /** Linked customer when the project maps 1:1 to a customer record. */
  customerId?: string;
  /** Repos in scope when this project is selected (Chief → GitHub). */
  githubRepos?: string[];
  /** Vault path prefixes in scope when this project is selected (Chief → Obsidian). */
  obsidianPathPrefixes?: string[];
}

/** Surfaces GitHub/Obsidian should honor for a selected project. */
export interface ProjectToolScope {
  projectId: string;
  /** Human label for UI (same as AppProject.name). */
  projectName: string;
  githubRepos: string[];
  obsidianPathPrefixes: string[];
}

/** Stable id for the M&S Painting product project (also Task/Workflow.projectId). */
export const MS_PAINTING_PROJECT_ID = "ms-painting";

/**
 * Known product projects. Add rows here (or later from Supabase) — do not
 * hardcode project lists inside Chief UI components.
 */
export const KNOWN_APP_PROJECTS: readonly AppProject[] = [
  {
    id: MS_PAINTING_PROJECT_ID,
    name: "M&S Painting",
    customerId: "cust-ms-painting",
    githubRepos: ["TrueCrew1/ms-painting"],
    // Prefix reserved for project notes; vault layout may still be empty.
    obsidianPathPrefixes: ["Projects/M&S Painting"],
  },
];

export type ProjectWorkSlice = {
  tasks: Task[];
  workflows: Workflow[];
  customers: Customer[];
};

function titleFromProjectId(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function customerForProjectId(customers: Customer[], projectId: string): Customer | undefined {
  return customers.find(
    (customer) => customer.slug === projectId || customer.id === projectId,
  );
}

/**
 * Merge known catalog with project ids discovered on tasks/workflows.
 * Result is sorted by name for stable dropdown order (Chief prepends Global).
 */
export function deriveAppProjects(data: ProjectWorkSlice): AppProject[] {
  const byId = new Map<string, AppProject>();

  for (const known of KNOWN_APP_PROJECTS) {
    byId.set(known.id, { ...known });
  }

  const stampedIds = new Set<string>();
  for (const task of data.tasks) {
    if (task.projectId) stampedIds.add(task.projectId);
  }
  for (const workflow of data.workflows) {
    if (workflow.projectId) stampedIds.add(workflow.projectId);
  }

  for (const projectId of stampedIds) {
    const existing = byId.get(projectId);
    const customer = customerForProjectId(data.customers, projectId);
    if (existing) {
      byId.set(projectId, {
        ...existing,
        customerId: existing.customerId ?? customer?.id,
        name: existing.name || customer?.name || titleFromProjectId(projectId),
      });
      continue;
    }
    byId.set(projectId, {
      id: projectId,
      name: customer?.name ?? titleFromProjectId(projectId),
      customerId: customer?.id,
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function listKnownAppProjects(): AppProject[] {
  return [...KNOWN_APP_PROJECTS];
}

export function getAppProject(
  projects: readonly AppProject[],
  projectId: string,
): AppProject | undefined {
  return projects.find((project) => project.id === projectId);
}

/** Clean scope payload for future GitHub/Obsidian tool routing. */
export function getProjectToolScope(
  projects: readonly AppProject[],
  projectId: string,
): ProjectToolScope | null {
  const project = getAppProject(projects, projectId);
  if (!project) return null;
  return {
    projectId: project.id,
    projectName: project.name,
    githubRepos: [...(project.githubRepos ?? [])],
    obsidianPathPrefixes: [...(project.obsidianPathPrefixes ?? [])],
  };
}
