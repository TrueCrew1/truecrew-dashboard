import { Panel, StageBadge } from "@/components/ui";
import type { CrewCapacity, TodayTask } from "@/lib/today/types";
import { formatSlaRemaining } from "@/lib/today/selectors";

interface InProgressPanelProps {
  tasks: TodayTask[];
  capacity: CrewCapacity[];
  onSelect: (taskId: string) => void;
}

export function InProgressPanel({ tasks, capacity, onSelect }: InProgressPanelProps) {
  return (
    <Panel
      title="In Progress"
      action={
        <span className="panel-count">{tasks.length} active</span>
      }
    >
      <div className="crew-capacity-bar">
        {capacity.map((crew) => (
          <div key={crew.crew} className="crew-capacity-item">
            <div className="crew-capacity-header">
              <span>{crew.label}</span>
              <span className="mono">
                {crew.inProgress}/{crew.capacity}
              </span>
            </div>
            <div className="crew-capacity-track">
              <div
                className={`crew-capacity-fill ${crew.utilization >= 100 ? "full" : crew.utilization >= 66 ? "warn" : ""}`}
                style={{ width: `${Math.min(crew.utilization, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {tasks.length === 0 ? (
        <div className="empty-state">No tasks in progress</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Crew</th>
              <th>SLA</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="clickable-row"
                onClick={() => onSelect(task.id)}
              >
                <td>{task.title}</td>
                <td>
                  <span className="crew-tag">{task.crew}</span>
                </td>
                <td>
                  <span className={`sla-badge sla-${task.slaTier}`}>
                    {formatSlaRemaining(task)}
                  </span>
                </td>
                <td>
                  <StageBadge stage={task.stage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
