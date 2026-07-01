import type {
  TaskWarningKind,
  TaskWarningSummary as WarningSummary,
} from "../../../lib/task-warnings";
import { TASK_WARNING_KIND_LABEL } from "../../../lib/task-warnings";

interface TaskWarningSummaryProps {
  summary: WarningSummary;
  /** When set, highlights the matching pill and enables drill/clear behavior */
  activeKind?: TaskWarningKind | null;
  /** When provided, pills become clickable to focus a warning kind in the task list */
  onKindSelect?: (kind: TaskWarningKind | null) => void;
}

export function TaskWarningSummary({
  summary,
  activeKind = null,
  onKindSelect,
}: TaskWarningSummaryProps) {
  if (summary.totalTasks === 0 || summary.warnedTasks === 0) return null;

  const kindsWithCounts = Object.entries(summary.byKind)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]) as [TaskWarningKind, number][];

  const displayKinds = onKindSelect ? kindsWithCounts : kindsWithCounts.slice(0, 3);

  return (
    <div className="task-warning-summary" role="status" aria-live="polite">
      <span className="task-warning-summary__lead">
        {summary.warnedTasks} of {summary.totalTasks} tasks need attention
      </span>
      {displayKinds.map(([kind, count]) => {
        const label = TASK_WARNING_KIND_LABEL[kind];
        const isActive = activeKind === kind;

        if (!onKindSelect) {
          return (
            <span key={kind} className="task-warning-summary__pill">
              {count} {label}
            </span>
          );
        }

        return (
          <button
            key={kind}
            type="button"
            className={[
              "task-warning-summary__pill",
              "task-warning-summary__pill--action",
              isActive ? "task-warning-summary__pill--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={isActive}
            onClick={() => onKindSelect(isActive ? null : kind)}
          >
            {count} {label}
          </button>
        );
      })}
      {onKindSelect && activeKind ? (
        <button
          type="button"
          className="task-warning-summary__clear"
          onClick={() => onKindSelect(null)}
        >
          Clear warning filter
        </button>
      ) : null}
    </div>
  );
}
