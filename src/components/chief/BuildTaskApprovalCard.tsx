import { Link } from "react-router-dom";
import { formatChiefTimestamp } from "./chiefMock";
import type { BuildGateTask } from "./hooks/useBuildTasks";

interface BuildTaskApprovalCardProps {
  task: BuildGateTask;
}

export function BuildTaskApprovalCard({ task }: BuildTaskApprovalCardProps) {
  const gateLabels = task.pendingGates.map((gate) => gate.name).join(", ");

  return (
    <article className={`chief-board-card chief-board-card--${task.tone}`}>
      <div className="chief-board-card-header">
        <span className="chief-board-card-title">{task.title}</span>
        {task.meta ? <span className="chief-board-card-meta">{task.meta}</span> : null}
      </div>
      <p className="chief-board-card-detail">{task.detail}</p>
      {task.priorityReason ? (
        <p className="chief-board-card-priority-reason">
          <span className="chief-board-card-priority-reason-label">Priority reason:</span>{" "}
          {task.priorityReason}
        </p>
      ) : null}
      {gateLabels && (
        <p className="chief-board-card-detail chief-board-card-gates">
          Pending gates: <strong>{gateLabels}</strong>
        </p>
      )}
      <footer className="chief-board-card-footer">
        <Link to={task.routeTo} className="chief-board-card-route">
          Open {task.routeLabel}
        </Link>
        {task.timestamp ? (
          <time className="chief-board-card-time" dateTime={task.timestamp}>
            {formatChiefTimestamp(task.timestamp)}
          </time>
        ) : null}
      </footer>
    </article>
  );
}
