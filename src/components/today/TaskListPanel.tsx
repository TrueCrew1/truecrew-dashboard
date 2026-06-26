import { Panel, StageBadge } from "@/components/ui";
import type { TodayTask } from "@/lib/today/types";
import { formatSlaRemaining } from "@/lib/today/selectors";

interface TaskListPanelProps {
  title: string;
  tasks: TodayTask[];
  onSelect: (taskId: string) => void;
  emptyMessage: string;
  showBlocker?: boolean;
  highlightOverdue?: boolean;
}

export function TaskListPanel({
  title,
  tasks,
  onSelect,
  emptyMessage,
  showBlocker = false,
  highlightOverdue = false,
}: TaskListPanelProps) {
  return (
    <Panel title={title} action={<span className="panel-count">{tasks.length}</span>}>
      {tasks.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Priority</th>
              <th>SLA</th>
              {showBlocker ? <th>Blocker</th> : <th>Stage</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={`clickable-row ${highlightOverdue ? "row-overdue" : ""}`}
                onClick={() => onSelect(task.id)}
              >
                <td>{task.title}</td>
                <td>
                  <span className={`priority-badge priority-${task.priority}`}>
                    {task.priority}
                  </span>
                </td>
                <td>
                  <span className={`sla-badge sla-${task.slaTier}`}>
                    {formatSlaRemaining(task)}
                  </span>
                </td>
                {showBlocker ? (
                  <td className="blocker-cell">
                    {task.blocker ?? (
                      <StageBadge stage={task.stage} />
                    )}
                  </td>
                ) : (
                  <td>
                    <StageBadge stage={task.stage} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
