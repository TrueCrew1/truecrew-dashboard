import { ShiftStatsStrip } from "@/components/dashboard/ShiftStatsStrip";
import { EmptyState, PageHeader, Panel, SeverityBadge, TaskStageSelect } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";

export function TodayPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();

  const activeIncidents = data.incidents.filter((i) => i.severity <= 2);
  const blockingTasks = data.tasks.filter((t) =>
    t.gates.some((g) => g.required && !g.passed),
  );

  return (
    <>
      <div className="page-intro">
        <PageHeader
          title="Today"
          subtitle="Focus queue, blocking gates, and active Sev 1–2 incidents"
        />
        <ShiftStatsStrip />
      </div>

      <div className="page-stack">
        <div className="grid-2">
          <Panel title="Focus queue">
            {data.focusItems.length === 0 ? (
              <EmptyState>No focus items right now.</EmptyState>
            ) : (
              <div className="table-scroll">
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
                        <td>{item.title}</td>
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
              <EmptyState>No active Sev 1–2 incidents.</EmptyState>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Incident</th>
                      <th>Severity</th>
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
            <EmptyState>No blocking gates — all required checks passed.</EmptyState>
          ) : (
            <div className="table-scroll">
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
                      <td>{task.title}</td>
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
