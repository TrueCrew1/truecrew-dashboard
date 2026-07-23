import { describe, expect, it } from "vitest";
import {
  CHIEF_CONTEXT_LIST,
  GLOBAL_CHIEF_CONTEXT_ID,
  buildChiefContextList,
  chiefContextScopeSummary,
  chiefProjectToolScope,
  isChiefContextId,
  resolveChiefProjects,
} from "@/components/chief/chiefContext";
import {
  KNOWN_APP_PROJECTS,
  MS_PAINTING_PROJECT_ID,
  deriveAppProjects,
  getProjectToolScope,
} from "@/data/projects";
import { mockCustomers, mockTasks, mockWorkflows } from "@/data/mockData";
import type { Task, Workflow } from "@/types";
import { WorkflowStage } from "@/types";

describe("app project inventory", () => {
  it("includes known projects and discovers stamped projectIds", () => {
    const projects = deriveAppProjects({
      tasks: mockTasks,
      workflows: mockWorkflows,
      customers: mockCustomers,
    });

    expect(projects.some((project) => project.id === MS_PAINTING_PROJECT_ID)).toBe(true);
    expect(KNOWN_APP_PROJECTS.some((project) => project.id === MS_PAINTING_PROJECT_ID)).toBe(true);
  });

  it("discovers a new project id from tasks without treating customers as projects", () => {
    const extraTask: Task = {
      ...mockTasks[0],
      id: "task-extra-project",
      projectId: "northwind-labs",
      linkedEntities: [{ type: "customer", id: "cust-002", label: "Northwind Labs" }],
    };
    const projects = deriveAppProjects({
      tasks: [...mockTasks, extraTask],
      workflows: mockWorkflows,
      customers: mockCustomers,
    });

    expect(projects.map((project) => project.id)).toContain("northwind-labs");
    expect(projects.map((project) => project.id)).toContain(MS_PAINTING_PROJECT_ID);
    // Untagged customers (e.g. Acme) are not auto-promoted to projects.
    expect(projects.map((project) => project.id)).not.toContain("acme-corp");
  });

  it("exposes GitHub/Obsidian scope for known projects", () => {
    const scope = getProjectToolScope(KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID);
    expect(scope?.githubRepos).toContain("TrueCrew1/ms-painting");
    expect(scope?.obsidianPathPrefixes.length).toBeGreaterThan(0);
  });
});

describe("chiefContext project list", () => {
  it("lists Global first, then every resolved app project", () => {
    const projects = resolveChiefProjects({
      tasks: mockTasks,
      workflows: mockWorkflows,
      customers: mockCustomers,
    });
    const list = buildChiefContextList(projects);

    expect(list[0]?.id).toBe(GLOBAL_CHIEF_CONTEXT_ID);
    expect(list[0]?.kind).toBe("global");
    expect(list.slice(1).every((context) => context.kind === "project")).toBe(true);
    expect(list.slice(1).map((context) => context.id)).toEqual(projects.map((project) => project.id));
  });

  it("static fallback list still includes M&S as a normal project", () => {
    expect(CHIEF_CONTEXT_LIST[0]?.id).toBe(GLOBAL_CHIEF_CONTEXT_ID);
    expect(CHIEF_CONTEXT_LIST.some((context) => context.id === MS_PAINTING_PROJECT_ID)).toBe(true);
    expect(CHIEF_CONTEXT_LIST.find((context) => context.id === MS_PAINTING_PROJECT_ID)?.kind).toBe(
      "project",
    );
  });

  it("validates ids against the provided list", () => {
    const list = buildChiefContextList(KNOWN_APP_PROJECTS);
    expect(isChiefContextId(GLOBAL_CHIEF_CONTEXT_ID, list)).toBe(true);
    expect(isChiefContextId(MS_PAINTING_PROJECT_ID, list)).toBe(true);
    expect(isChiefContextId("unknown-project", list)).toBe(false);
  });

  it("summarizes Global vs project scope and tool scope", () => {
    const list = buildChiefContextList(KNOWN_APP_PROJECTS);
    const global = list[0]!;
    const ms = list.find((context) => context.id === MS_PAINTING_PROJECT_ID)!;

    expect(chiefContextScopeSummary(global)).toMatch(/Non-project and cross-project/);
    expect(chiefContextScopeSummary(ms)).toMatch(/Tools and context stay in M&S Painting/);
    expect(chiefProjectToolScope(GLOBAL_CHIEF_CONTEXT_ID, KNOWN_APP_PROJECTS)).toBeNull();
    expect(chiefProjectToolScope(MS_PAINTING_PROJECT_ID, KNOWN_APP_PROJECTS)?.githubRepos).toContain(
      "TrueCrew1/ms-painting",
    );
  });

  it("keeps workflow-only project stamps discoverable", () => {
    const workflow: Workflow = {
      id: "wf-extra",
      title: "Extra project workflow",
      type: "build",
      stage: WorkflowStage.InProgress,
      owner: "founder",
      summary: "Scoped via workflow projectId only",
      gates: [],
      linkedTaskIds: [],
      linkedEntityIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "founder",
      projectId: "field-ops-beta",
    };
    const projects = deriveAppProjects({
      tasks: mockTasks,
      workflows: [...mockWorkflows, workflow],
      customers: mockCustomers,
    });
    expect(projects.some((project) => project.id === "field-ops-beta")).toBe(true);
  });
});
