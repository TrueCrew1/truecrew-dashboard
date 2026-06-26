import { canAdvanceStage, getNextStage } from "../../lib/gates/stage";
import type { GateCheck, Task, WorkflowStage, WorkflowType } from "@/types";

export interface WhatsNextGuidance {
  headline: string;
  nextGateLabel?: string;
  recommendation: string;
  readyToAdvance: boolean;
}

export interface PostAdvanceSummary {
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  guidance: WhatsNextGuidance;
}

export function getFirstBlockingGate(gates: GateCheck[]): GateCheck | undefined {
  return gates.find((gate) => gate.required && !gate.passed);
}

function getStageRecommendation(workflowType: WorkflowType, stage: WorkflowStage): string | null {
  const byType: Partial<Record<WorkflowType, Partial<Record<WorkflowStage, string>>>> = {
    build: {
      Inbox: "Capture acceptance criteria before planning the build.",
      Triage: "Confirm scope and link the GitHub branch.",
      Planned: "Move to In Progress and open a PR when implementation starts.",
      "In Progress": "Open a PR and link the branch to pass build gates.",
      Waiting: "Resolve the blocker, then resume the build.",
      Review: "Request review and address feedback before marking Done.",
      Done: "Deploy or hand off, then log the build outcome.",
    },
    deploy: {
      Planned: "Confirm build gates are clear before scheduling deploy.",
      "In Progress": "Run the deploy and verify health checks.",
      Review: "Confirm rollback plan and sign off on production release.",
    },
    decision: {
      Review: "Record the decision to unblock downstream work.",
      Done: "Communicate the outcome and log the decision.",
    },
    onboarding: {
      Waiting: "Follow up on the external blocker or dependency.",
      "In Progress": "Complete provisioning and customer handoff steps.",
      Review: "Confirm onboarding checklist before marking active.",
    },
    repair: {
      Triage: "Confirm severity and assign an owner for mitigation.",
      "In Progress": "Mitigate the incident and verify service recovery.",
      Review: "Document root cause and close the repair workflow.",
    },
    ticket: {
      Triage: "Assign category and priority, then plan the fix.",
      Planned: "Schedule work or link to a build/repair workflow.",
      "In Progress": "Implement the fix and confirm with the customer.",
    },
  };

  return byType[workflowType]?.[stage] ?? null;
}

export function getWhatsNextGuidance(task: Task): WhatsNextGuidance {
  const blockingGate = getFirstBlockingGate(task.gates);
  const nextStage = getNextStage(task.stage);
  const readyToAdvance = canAdvanceStage(task.stage, task.gates);
  const stageRecommendation = getStageRecommendation(task.workflowType, task.stage);

  if (blockingGate) {
    const recommendation =
      stageRecommendation ?? `Complete "${blockingGate.label}" to continue in ${task.stage}.`;

    return {
      headline: "Next required gate",
      nextGateLabel: blockingGate.label,
      recommendation: task.blocker
        ? `${recommendation} Blocker: ${task.blocker}`
        : recommendation,
      readyToAdvance: false,
    };
  }

  if (readyToAdvance && nextStage) {
    return {
      headline: "Ready to advance",
      recommendation:
        stageRecommendation ??
        `All required gates passed — advance to ${nextStage} when ready.`,
      readyToAdvance: true,
    };
  }

  if (task.blocker) {
    return {
      headline: "Waiting on blocker",
      recommendation: task.blocker,
      readyToAdvance: false,
    };
  }

  if (task.stage === "Done" || task.stage === "Logged") {
    return {
      headline: "Workflow complete",
      recommendation:
        stageRecommendation ?? "No further stage actions — archive or log outcomes as needed.",
      readyToAdvance: false,
    };
  }

  return {
    headline: "Continue in current stage",
    recommendation:
      stageRecommendation ?? `Keep working in ${task.stage} until required gates are complete.`,
    readyToAdvance: false,
  };
}

export function getPostAdvanceSummary(
  task: Task,
  fromStage: WorkflowStage,
  toStage: WorkflowStage,
): PostAdvanceSummary {
  return {
    fromStage,
    toStage,
    guidance: getWhatsNextGuidance({ ...task, stage: toStage }),
  };
}
