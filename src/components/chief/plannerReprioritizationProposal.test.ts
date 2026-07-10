#!/usr/bin/env node
/**
 * Deterministic unit tests for the Planner re-sequencing signal.
 *   npx tsx --test src/components/chief/plannerReprioritizationProposal.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  PLANNER_REPRIORITIZATION_PROPOSAL_ID,
  buildPlannerReprioritizationRequest,
  proposePlannerReprioritization,
} from "./plannerReprioritizationProposal";
import type { ChiefLiveContext } from "./chiefLiveContext";
import type { ApprovalProposal } from "./types";
import { WorkflowStage, type Task } from "@/types";

function task(id: string, title: string, workflowType: Task["workflowType"]): Task {
  return {
    id,
    title,
    description: "",
    stage: WorkflowStage.InProgress,
    workflowType,
    priority: "medium",
    gates: [],
    linkedEntities: [],
    dueAt: "2020-01-01T00:00:00.000Z",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    createdBy: "operator",
  };
}

function contextWith(overdueTasks: Task[]): ChiefLiveContext {
  return {
    stats: {} as ChiefLiveContext["stats"],
    focusItems: [],
    alerts: [],
    openTaskCount: overdueTasks.length,
    blockingTasks: [],
    overdueTasks,
    tasksMissingCustomer: [],
    tasksMissingWorkflow: [],
    activeIncidents: [],
    blockedDeploys: [],
    waitingCustomers: [],
  };
}

const CREATED_AT = "2026-07-10T00:00:00.000Z";

test("no overdue tasks → no_signal, no card", () => {
  const result = proposePlannerReprioritization(contextWith([]), []);
  assert.deepEqual(result, { outcome: "no_signal" });
});

test("overdue tasks → queued card routed as planner_agent", () => {
  const context = contextWith([
    task("t-1", "Replace pump seal", "repair"),
    task("t-2", "Ship deploy", "deploy"),
  ]);
  const result = proposePlannerReprioritization(context, []);
  assert.equal(result.outcome, "queued");
  if (result.outcome !== "queued") return;
  assert.equal(result.card.id, PLANNER_REPRIORITIZATION_PROPOSAL_ID);
  assert.equal(result.card.source, "planner_agent");
  assert.equal(result.card.status, "pending");
  assert.match(result.card.title, /Planner: Roadmap reprioritization/);
});

test("dedupes while a proposal is already pending", () => {
  const context = contextWith([task("t-1", "Replace pump seal", "repair")]);
  const pending: ApprovalProposal[] = [
    {
      id: PLANNER_REPRIORITIZATION_PROPOSAL_ID,
      title: "existing",
      summary: "",
      recommendedAction: "",
      riskNote: "",
      status: "pending",
      createdAt: CREATED_AT,
    },
  ];
  const result = proposePlannerReprioritization(context, pending);
  assert.deepEqual(result, { outcome: "blocked", reason: "already_pending" });
});

test("request is deterministic and summarizes affected workflow types", () => {
  const context = contextWith([
    task("t-1", "Replace pump seal", "repair"),
    task("t-2", "Ship deploy", "deploy"),
    task("t-3", "Fix ticket", "repair"),
  ]);
  const first = buildPlannerReprioritizationRequest(context, CREATED_AT);
  const second = buildPlannerReprioritizationRequest(context, CREATED_AT);
  assert.deepEqual(first, second);
  assert.deepEqual(first.affectedPhases, ["deploy workflow", "repair workflow"]);
  assert.match(first.summary, /3 open tasks past due across 2 workflow types/);
});
