import { StageBadge } from "@/components/ui";
import { useWorkOrderStatus } from "@/lib/hooks/useWorkOrderStatus";
import type { WorkflowStage, WorkflowType } from "@/types";

export interface WOCardProps {
  taskId: string;
  title: string;
  stage: WorkflowStage;
  workflowType: WorkflowType;
  meta?: string;
}

export function WOCard({ taskId, title, stage, workflowType, meta }: WOCardProps) {
  const { status, displayStage, advanceLabel, canAdvance, error, errorFlash, advance } =
    useWorkOrderStatus({ taskId, stage });

  return (
    <div className={`wo-card rail-item ${errorFlash ? "wo-card-error" : ""}`}>
      <div className="wo-card-body">
        <div className="rail-item-title">{title}</div>
        <div className="rail-item-meta">
          <StageBadge stage={displayStage} /> · {workflowType}
          {meta ? <> · {meta}</> : null}
        </div>
        <div className="wo-card-status" aria-live="polite">
          {status}
        </div>
      </div>
      <div className="wo-card-actions">
        {canAdvance && advanceLabel ? (
          <button
            type="button"
            className="wo-advance-btn"
            onClick={advance}
            aria-label={`${advanceLabel} work order: ${title}`}
          >
            {advanceLabel}
          </button>
        ) : (
          <div className="wo-advance-btn-placeholder" aria-hidden="true" />
        )}
      </div>
      {error ? (
        <div className="wo-card-error-msg" role="status">
          {error}
        </div>
      ) : null}
    </div>
  );
}
