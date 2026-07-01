import type { TaskWarning } from "../../../lib/task-warnings";

export function TaskWarningInline({ warning }: { warning: TaskWarning | null }) {
  if (!warning) return null;

  return (
    <div
      className={`task-warning task-warning--${warning.kind}`}
      title={warning.detail}
      role="status"
    >
      {warning.label}
    </div>
  );
}
