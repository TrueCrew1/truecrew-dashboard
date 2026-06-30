import { Link } from "react-router-dom";
import { ShiftStatsStrip } from "@/components/dashboard/ShiftStatsStrip";
import { EntityContextMeta, TaskCell } from "@/components/tasks/TaskCell";
import {
  EmptyState,
  PageHeader,
  Panel,
  SeverityBadge,
  TaskStageSelect,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";

const OPERATOR_TABLE =
  "table-scroll table-scroll--wide table-scroll--sticky-first";

export function TodayPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();

  const activeIncidents = data.incidents.filter((i) => i.severity <= 2);
  const blockingTasks = data.tasks.filter((t) =>
    t.gates.some((g) => g.required && !g.passed),
  );

  return (
    <>
      <PageHeader
        title="Today"
        subtitle="Focus items, overdue gates, and active Sev 1–2 incidents"
      />

      <ShiftStatsStrip />

      <div className="page-stack">
        <div className="grid-2">
          <Panel title="Focus queue">
            {data.focusItems.length === 0 ? (
              <div className="panel-empty" data-empty="focus" role="status">
                <EmptyState
                  title="Focus queue is clear"
                  description="No items need immediate operator attention right now."
                  variant="success"
                  action={
                    <Link to="/operations" className="empty-state-link">
                      View all tasks
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className={OPERATOR_TABLE}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Stage</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.focusItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`clickable-row${selectedEntityId === item.taskId ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(item.taskId)}
                      >
                        <td>
                          <EntityContextMeta entityId={item.taskId} title={item.title} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <TaskStageSelect taskId={item.taskId} stage={item.stage} />
                        </td>
                        <td className="cell-muted">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Active incidents">
            {activeIncidents.length === 0 ? (
              <div className="panel-empty" data-empty="incidents" role="status">
                <EmptyState
                  title="No Sev 1–2 incidents"
                  description="No critical or high-severity incidents are open."
                  variant="success"
                  action={
                    <Link to="/monitor" className="empty-state-link">
                      Open Monitor
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className={OPERATOR_TABLE}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Incident</th>
                      <th>Sev</th>
                      <th>Service</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        className={`clickable-row${selectedEntityId === inc.id ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(inc.id)}
                      >
                        <td>{inc.title}</td>
                        <td>
                          <SeverityBadge severity={inc.severity} />
                        </td>
                        <td>{inc.serviceName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Blocking gates">
          {blockingTasks.length === 0 ? (
            <div className="panel-empty" data-empty="gates" role="status">
              <EmptyState
                title="All gates passed"
                description="No open required gates are blocking task progress."
                variant="success"
                action={
                  <Link to="/operations" className="empty-state-link">
                    Review all workflows
                  </Link>
                }
              />
            </div>
          ) : (
            <div className={OPERATOR_TABLE}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Stage</th>
                    <th>Blocking gates</th>
                  </tr>
                </thead>
                <tbody>
                  {blockingTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                      onClick={() => setSelectedEntityId(task.id)}
                    >
                      <td>
                        <TaskCell task={task} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <TaskStageSelect taskId={task.id} stage={task.stage} />
                      </td>
                      <td className="cell-warning">
                        {task.gates
                          .filter((g) => g.required && !g.passed)
                          .map((g) => g.label)
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
