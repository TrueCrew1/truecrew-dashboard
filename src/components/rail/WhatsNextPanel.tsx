import { StageBadge } from "@/components/ui";
import { getNextAction } from "@/components/rail/nextActionCopy";
import type { GateCheck, Task, WorkflowStage, WorkflowType } from "@/types";

export interface WhatsNextPanelProps {
  stage: WorkflowStage;
  workflowType: WorkflowType;
  gates: GateCheck[];
}

export function WhatsNextPanel({ stage, workflowType, gates }: WhatsNextPanelProps) {
  const unmetGates = gates.filter((gate) => gate.required && !gate.passed).slice(0, 3);
  const nextAction = getNextAction(workflowType, stage);

  return (
    <div className="rail-section rail-whats-next">
      <div className="rail-section-title">What's next</div>
      <div className="rail-item">
        <StageBadge stage={stage} />
        <p className="rail-whats-next-action">{nextAction}</p>
        {unmetGates.length > 0 ? (
          <ul className="rail-whats-next-gates">
            {unmetGates.map((gate) => (
              <li key={gate.id}>{gate.label}</li>
            ))}
          </ul>
        ) : (
          <p className="rail-item-meta">All gates clear</p>
        )}
      </div>
    </div>
  );
}

export function whatsNextPanelPropsFromTask(
  task: Pick<Task, "stage" | "workflowType" | "gates">,
): WhatsNextPanelProps {
  return {
    stage: task.stage,
    workflowType: task.workflowType,
    gates: task.gates,
  };
}
