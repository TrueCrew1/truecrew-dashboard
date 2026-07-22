import { CHIEF_ROUTES, routeForTask } from "@/components/chief/chiefRoutes";
import type { SearchDataContext, SearchResult, SearchResultSource } from "../types";
import { scoreTerms, tokenizeQuery } from "../normalize";

function agentSource(item: { source?: "live" | "mock" }): SearchResultSource {
  return item.source === "live" ? "live" : "mock";
}

/** Live-backed entities: `live` only when Supabase rail; otherwise `mock`. */
function railBackedSource(ctx: SearchDataContext): SearchResultSource {
  return ctx.dataRail === "supabase" ? "live" : "mock";
}

export function searchTasks(ctx: SearchDataContext, query: string): SearchResult[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const task of ctx.tasks) {
    const haystack = [
      task.id,
      task.title,
      task.description,
      task.workflowType,
      task.assignee,
      task.blocker ?? "",
      task.githubRef ?? "",
      task.linkedEntities.map((entity) => entity.label).join(" "),
    ].join(" ");

    const score = scoreTerms(haystack, terms);
    if (score <= 0) continue;

    results.push({
      id: task.id,
      type: "task",
      title: task.title,
      subtitle: `${task.id} · ${task.stage}`,
      description: task.description,
      route: routeForTask(task),
      routeLabel: "Open task",
      score: score + (task.blocker ? 1 : 0),
      source: railBackedSource(ctx),
      meta: { stage: task.stage, workflowType: task.workflowType },
    });
  }
  return results;
}

export function searchProjects(ctx: SearchDataContext, query: string): SearchResult[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const program of ctx.programs) {
    const haystack = [
      program.id,
      program.title,
      program.purpose,
      program.currentTask,
      program.repoRef,
      program.ownerAgent,
      program.docPath,
    ].join(" ");

    const score = scoreTerms(haystack, terms);
    if (score <= 0) continue;

    results.push({
      id: program.id,
      type: "project",
      title: program.title,
      subtitle: program.ownerAgent,
      description: program.currentTask,
      route: CHIEF_ROUTES.today,
      routeLabel: "Open Programs",
      score: score + (program.isMaster ? 2 : 0),
      source: "adapter",
      tags: [program.statusTone, program.repoRef],
      meta: { docPath: program.docPath },
    });
  }
  return results;
}

export function searchAgents(ctx: SearchDataContext, query: string): SearchResult[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const item of ctx.agentWork) {
    const haystack = [item.agent, item.task, item.note, item.status, item.id].join(" ");
    const score = scoreTerms(haystack, terms);
    if (score <= 0) continue;

    results.push({
      id: item.id,
      type: "agent",
      title: item.agent,
      subtitle: item.status.replaceAll("_", " "),
      description: item.task,
      route: CHIEF_ROUTES.today,
      routeLabel: "Open Agents",
      score,
      source: agentSource(item),
      tags: [item.status, item.priority],
    });
  }
  return results;
}

export function searchDocuments(ctx: SearchDataContext, query: string): SearchResult[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const docs = [
    ...ctx.runbooks.map((entry) => ({
      id: entry.id,
      title: entry.title,
      kind: "runbook",
      tags: entry.tags,
      description: entry.summary,
      source: railBackedSource(ctx),
    })),
    ...ctx.prompts.map((entry) => ({
      id: entry.id,
      title: entry.title,
      kind: "prompt",
      tags: entry.tags,
      description: entry.content.slice(0, 120),
      source: railBackedSource(ctx),
    })),
    ...ctx.notes.map((entry) => ({
      id: entry.id,
      title: entry.title,
      kind: "note",
      tags: entry.tags ?? [],
      description: entry.summary,
      source: railBackedSource(ctx),
    })),
    ...ctx.programs.map((program) => ({
      id: program.docPath,
      title: program.docPath.split("/").pop() ?? program.docPath,
      kind: "roadmap",
      tags: [program.repoRef, program.ownerAgent],
      description: program.purpose,
      source: "adapter" as const,
    })),
  ];

  const results: SearchResult[] = [];
  for (const doc of docs) {
    const haystack = [doc.id, doc.title, doc.kind, doc.description, doc.tags.join(" ")].join(" ");
    const score = scoreTerms(haystack, terms);
    if (score <= 0) continue;

    results.push({
      id: doc.id,
      type: "document",
      title: doc.title,
      subtitle: doc.kind,
      description: doc.description,
      route: CHIEF_ROUTES.knowledge,
      routeLabel: "Open knowledge",
      score,
      source: doc.source,
      tags: doc.tags,
    });
  }
  return results;
}

export function searchActiveWork(ctx: SearchDataContext, query: string): SearchResult[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];

  for (const item of ctx.focusItems) {
    const haystack = [item.title, item.reason, item.taskId, item.workflowType].join(" ");
    const score = scoreTerms(haystack, terms);
    if (score <= 0) continue;
    results.push({
      id: item.id,
      type: "focus_item",
      title: item.title,
      subtitle: "Focus queue",
      description: item.reason,
      route: CHIEF_ROUTES.today,
      routeLabel: "Open Today",
      score: score + 2,
      source: railBackedSource(ctx),
      tags: [item.workflowType],
    });
  }

  for (const request of ctx.researchRequests) {
    const haystack = [request.id, request.topic, request.whyItMatters, request.suggestedOutcome].join(
      " ",
    );
    const score = scoreTerms(haystack, terms);
    if (score <= 0) continue;
    results.push({
      id: request.id,
      type: "research_request",
      title: request.topic,
      subtitle: "Research queue",
      description: request.whyItMatters,
      route: CHIEF_ROUTES.knowledge,
      routeLabel: "Open research",
      score,
      source: request.source === "session" ? "session" : "adapter",
    });
  }

  for (const proposal of ctx.approvalCandidates ?? []) {
    if (proposal.status !== "pending") continue;
    const haystack = [proposal.id, proposal.title, proposal.summary, proposal.specialist ?? ""].join(
      " ",
    );
    const score = scoreTerms(haystack, terms);
    if (score <= 0) continue;
    results.push({
      id: proposal.id,
      type: "approval",
      title: proposal.title,
      subtitle: proposal.specialist ?? "Approval",
      description: proposal.summary,
      route: CHIEF_ROUTES.today,
      routeLabel: "Open approvals",
      score: score + 1,
      source: railBackedSource(ctx),
    });
  }

  return results;
}

export function searchCustomers(ctx: SearchDataContext, query: string): SearchResult[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const customer of ctx.customers) {
    const haystack = [customer.id, customer.name, customer.email, customer.primaryContact].join(" ");
    const score = scoreTerms(haystack, terms);
    if (score <= 0) continue;
    results.push({
      id: customer.id,
      type: "customer",
      title: customer.name,
      subtitle: customer.email,
      route: CHIEF_ROUTES.customers,
      routeLabel: "Open customers",
      score,
      source: railBackedSource(ctx),
    });
  }
  return results;
}
