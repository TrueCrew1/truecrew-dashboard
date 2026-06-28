import { WorkflowStage, type WorkflowType } from "@/types";

const STAGE_ACTIONS: Record<WorkflowStage, string> = {
  [WorkflowStage.Inbox]: "Capture details and move to triage when ready.",
  [WorkflowStage.Triage]: "Confirm scope, then plan the next step.",
  [WorkflowStage.Planned]: "Start work or assign an owner.",
  [WorkflowStage.InProgress]: "Finish the work and clear open gates.",
  [WorkflowStage.Waiting]: "Follow up on the blocker, then advance.",
  [WorkflowStage.Review]: "Complete review and confirm gates pass.",
  [WorkflowStage.Done]: "Log outcomes and close related items.",
  [WorkflowStage.Logged]: "No further action — task is archived.",
};

const TYPE_STAGE_ACTIONS: Partial<Record<`${WorkflowType}:${WorkflowStage}`, string>> = {
  "build:Inbox": "Capture the build request and link the repo.",
  "build:Triage": "Confirm acceptance criteria before planning.",
  "build:Planned": "Open a branch and link it to this task.",
  "build:In Progress": "Finish the change and open a PR.",
  "build:Review": "Get CI green and merge when approved.",
  "build:Done": "Deploy and confirm health checks pass.",
  "deploy:Planned": "Confirm the build gates before promoting.",
  "deploy:In Progress": "Run the deploy and watch service health.",
  "deploy:Review": "Verify staging or preview before production.",
  "repair:In Progress": "Mitigate the issue and document the fix.",
  "repair:Review": "Confirm the service is stable, then resolve.",
  "ticket:Triage": "Confirm the report and set priority.",
  "ticket:In Progress": "Work the fix and update the customer.",
  "onboarding:Waiting": "Chase the external dependency, then resume.",
  "onboarding:In Progress": "Complete the next onboarding checklist item.",
  "decision:Review": "Record the decision and notify stakeholders.",
};

export function getNextAction(workflowType: WorkflowType, stage: WorkflowStage): string {
  return (
    TYPE_STAGE_ACTIONS[`${workflowType}:${stage}`] ??
    STAGE_ACTIONS[stage] ??
    "Advance the task when the next step is ready."
  );
}
