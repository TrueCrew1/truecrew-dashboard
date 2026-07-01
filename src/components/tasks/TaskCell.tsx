import { useMemo } from "react";
import {
  resolveEntityContext,
  resolveTaskContextFromTask,
  type TaskContext,
} from "../../../lib/task-context";
import { derivePrimaryTaskWarning } from "../../../lib/task-warnings";
import { useData } from "@/context/DataContext";
import type { Task } from "@/types";
import { TaskWarningInline } from "@/components/tasks/TaskWarningInline";

export function TaskContextMeta({ context }: { context: TaskContext }) {
  const isMissing = context.customerSource === "none";
  const isInferred = context.customerSource === "title_match";
  const customerClass = [
    isMissing ? "task-context-customer--missing" : "",
    isInferred ? "task-context-customer--inferred" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="task-context-meta">
      <span
        className={`task-context-customer ${customerClass}`.trim()}
        title={
          isMissing
            ? "No customer is linked to this task"
            : isInferred
              ? "Customer inferred from task title — not a confirmed link"
              : undefined
        }
      >
        {context.customerName}
        {isInferred ? " (inferred)" : ""}
      </span>
      <span className="task-context-sep" aria-hidden>
        ·
      </span>
      <span className="task-context-work-order">
        {context.workOrderName !== context.workOrderId ? (
          <>
            <span>{context.workOrderName}</span>
            <span className="task-context-sep" aria-hidden>
              ·
            </span>
          </>
        ) : null}
        <span className="mono">{context.workOrderId}</span>
      </span>
    </div>
  );
}

export function TaskCell({ task }: { task: Task }) {
  const { data } = useData();
  const context = useMemo(
    () =>
      resolveTaskContextFromTask(task, {
        customers: data.customers,
        workflows: data.workflows,
      }),
    [task, data.customers, data.workflows],
  );
  const warning = useMemo(
    () =>
      derivePrimaryTaskWarning(task, {
        customers: data.customers,
        workflows: data.workflows,
      }),
    [task, data.customers, data.workflows],
  );

  return (
    <div className="task-cell">
      <div className="task-cell-title" title={task.title}>
        {task.title}
      </div>
      <TaskContextMeta context={context} />
      <TaskWarningInline warning={warning} />
    </div>
  );
}

export function EntityContextMeta({ entityId, title }: { entityId: string; title: string }) {
  const { data } = useData();
  const context = useMemo(
    () =>
      resolveEntityContext(entityId, data.tasks, {
        customers: data.customers,
        workflows: data.workflows,
      }),
    [entityId, data.tasks, data.customers, data.workflows],
  );
  const task = useMemo(
    () => data.tasks.find((entry) => entry.id === entityId),
    [entityId, data.tasks],
  );
  const warning = useMemo(
    () =>
      task
        ? derivePrimaryTaskWarning(task, {
            customers: data.customers,
            workflows: data.workflows,
          })
        : null,
    [task, data.customers, data.workflows],
  );

  return (
    <div className="task-cell">
      <div className="task-cell-title" title={title}>
        {title}
      </div>
      <TaskContextMeta context={context} />
      <TaskWarningInline warning={warning} />
    </div>
  );
}
