import type { MockData } from "@/data/mockData";
import {
  WorkflowStage,
  type Customer,
  type Deploy,
  type Incident,
  type Persona,
  type Task,
  type TaskPriority,
  type Tool,
} from "@/types";

const MS_HOUR = 3600000;

export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / MS_HOUR;
}

export function daysSince(iso: string): number {
  return hoursSince(iso) / 24;
}

export function formatAge(iso: string): string {
  const hours = Math.floor(hoursSince(iso));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function isResolvedIncident(incident: Incident): boolean {
  return incident.status === "resolved" || incident.status === "post_mortem_filed";
}

export function hasFailedRequiredGate(task: Task): boolean {
  return task.gates.some((gate) => gate.required && !gate.passed);
}

export function failedGateLabels(task: Task): string[] {
  return task.gates.filter((g) => g.required && !g.passed).map((g) => g.label);
}

export function isGateBlockedTask(task: Task): boolean {
  const gatedStages = [WorkflowStage.InProgress, WorkflowStage.Review, WorkflowStage.Planned];
  return gatedStages.includes(task.stage) && hasFailedRequiredGate(task);
}

export function isWaitingBlockedTask(task: Task): boolean {
  return task.stage === WorkflowStage.Waiting && Boolean(task.blocker);
}

export function isBlockedTask(task: Task): boolean {
  return isWaitingBlockedTask(task) || isGateBlockedTask(task);
}

export function productionTools(data: MockData): Tool[] {
  return data.tools.filter((tool) => tool.environment === "production");
}

export function revenueCriticalTools(data: MockData): Tool[] {
  return productionTools(data).filter((tool) => tool.tags.includes("revenue-critical"));
}

export function revenueCriticalToolIds(data: MockData): Set<string> {
  return new Set(revenueCriticalTools(data).map((tool) => tool.id));
}

export function isRevenueCriticalTool(data: MockData, toolId: string): boolean {
  return revenueCriticalToolIds(data).has(toolId);
}

export function taskTouchesRevenueCritical(data: MockData, task: Task): boolean {
  return task.linkedEntities.some(
    (ref) => ref.type === "tool" && isRevenueCriticalTool(data, ref.id),
  );
}

export function openIncidents(data: MockData): Incident[] {
  return data.incidents.filter((inc) => !isResolvedIncident(inc));
}

export function openHighRiskIncidents(data: MockData): Incident[] {
  return openIncidents(data).filter((inc) => inc.severity <= 2);
}

export function inFlightProductionDeploys(data: MockData): Deploy[] {
  return data.deploys.filter(
    (deploy) =>
      deploy.environment === "production" &&
      deploy.stage !== WorkflowStage.Done &&
      deploy.stage !== WorkflowStage.Logged,
  );
}

export function checklistProgress(customer: Customer): { done: number; total: number } {
  const required = customer.onboardingChecklist.filter((item) => item.required);
  const total = required.length;
  const done = required.filter((item) => item.passed).length;
  return { done, total };
}

export function customerHasOpenHighTicket(data: MockData, customer: Customer): boolean {
  return customer.linkedTicketIds.some((taskId) => {
    const task = data.tasks.find((t) => t.id === taskId);
    return (
      task != null &&
      (task.priority === "high" || task.priority === "critical") &&
      task.stage !== WorkflowStage.Done &&
      task.stage !== WorkflowStage.Logged
    );
  });
}

export function personaLabel(persona: Persona): string {
  return persona === "founder" ? "Founder" : persona === "operator" ? "Operator" : "Observer";
}

export function priorityWeight(priority: TaskPriority): number {
  const map: Record<TaskPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return map[priority];
}

export function withinDays(iso: string, days: number): boolean {
  return daysSince(iso) <= days;
}

export function isOverdue(task: Task): boolean {
  return task.dueAt != null && new Date(task.dueAt).getTime() < Date.now();
}
