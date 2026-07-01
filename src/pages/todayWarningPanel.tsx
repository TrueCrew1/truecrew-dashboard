import { useMemo, useState } from "react";
import { PanelFilterEmpty } from "@/components/ui";
import type { Task } from "@/types";
import type { TaskContextData } from "../../lib/task-context";
import {
  summarizeTaskWarnings,
  TASK_WARNING_KIND_LABEL,
  taskMatchesWarningKind,
  type TaskWarningKind,
} from "../../lib/task-warnings";

function resolveTaskSelf(task: Task): Task {
  return task;
}

export function filterTodayPanelItemsByWarningKind<T>(
  items: T[],
  warningKind: TaskWarningKind | null,
  getTask: (item: T) => Task | undefined,
  context: TaskContextData,
): T[] {
  if (!warningKind) return items;
  return items.filter((item) => {
    const task = getTask(item);
    return task && taskMatchesWarningKind(task, warningKind, context);
  });
}

export function useTodayPanelWarningFilter<T>(
  items: T[],
  context: TaskContextData,
  getTask: (item: T) => Task | undefined,
) {
  const [warningKind, setWarningKind] = useState<TaskWarningKind | null>(null);

  const tasksForSummary = useMemo(
    () =>
      items
        .map(getTask)
        .filter((task): task is Task => Boolean(task)),
    [items, getTask],
  );

  const warningSummary = useMemo(
    () => summarizeTaskWarnings(tasksForSummary, context),
    [tasksForSummary, context],
  );

  const displayItems = useMemo(
    () => filterTodayPanelItemsByWarningKind(items, warningKind, getTask, context),
    [items, warningKind, getTask, context],
  );

  return {
    warningKind,
    setWarningKind,
    warningSummary,
    displayItems,
  };
}

export function useTodayTaskPanelWarningFilter(
  tasks: Task[],
  context: TaskContextData,
) {
  return useTodayPanelWarningFilter(tasks, context, resolveTaskSelf);
}

export function TodayWarningFilterEmpty({
  emptyKey,
  warningKind,
  itemLabel,
  onClear,
}: {
  emptyKey: string;
  warningKind: TaskWarningKind;
  /** Panel-specific noun, e.g. "focus items" or "blocking gate tasks" */
  itemLabel: string;
  onClear: () => void;
}) {
  const filterLabel = TASK_WARNING_KIND_LABEL[warningKind];
  return (
    <PanelFilterEmpty
      emptyKey={emptyKey}
      filterLabel={filterLabel}
      description={`No ${itemLabel} match the ${filterLabel} warning right now.`}
      clearAction={
        <button type="button" className="empty-state-link" onClick={onClear}>
          Clear warning filter
        </button>
      }
    />
  );
}
