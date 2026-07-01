import type { TaskWarningSummary as WarningSummary } from "../../../lib/task-warnings";

const KIND_LABEL: Record<keyof WarningSummary["byKind"], string> = {
  external_dependency: "blocked",
  time_gate: "past due",
  gate_open: "gates open",
  missing_data: "missing links",
  waiting: "waiting",
  readiness: "readiness",
};

export function TaskWarningSummary({ summary }: { summary: WarningSummary }) {
  if (summary.totalTasks === 0 || summary.warnedTasks === 0) return null;

  const topKinds = Object.entries(summary.byKind)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="task-warning-summary" role="status" aria-live="polite">
      <span className="task-warning-summary__lead">
        {summary.warnedTasks} of {summary.totalTasks} tasks need attention
      </span>
      {topKinds.map(([kind, count]) => (
        <span key={kind} className="task-warning-summary__pill">
          {count} {KIND_LABEL[kind as keyof WarningSummary["byKind"]]}
        </span>
      ))}
    </div>
  );
}
