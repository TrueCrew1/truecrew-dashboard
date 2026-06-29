import { PageHeader, Panel, SeverityBadge, StatGrid, TaskStageSelect } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";

export function TodayPage() {
  const { setSelectedEntityId } = useSelection();
  const { data } = useData();

  const focusItems = data.focusItems;
  const activeIncidents = data.incidents.filter((i) => i.severity <= 2);
  const blockingTasks = data.tasks.filter((t) =>
    t.gates.some((g) => g.required && !g.passed),
  );

  return (
    <div className="today-page">
      <PageHeader
        title="Today"
        subtitle="Focus items, overdue gates, and active Sev 1–2 incidents"
      />

      <StatGrid
        stats={[
          { label: "Focus items", value: focusItems.length },
          { label: "Active incidents", value: activeIncidents.length },
          { label: "Blocking gates", value: blockingTasks.length },
        ]}
      />

      <div className="today-sections">
        <div className="grid-2 today-panels">
          <Panel title="Focus queue">
            {focusItems.length === 0 ? (
              <div className="empty-state">No focus items for today.</div>
            ) : (
              <div className="table-scroll">
                <table className="data-table data-table--sticky-first data-table--compact">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Stage</th>
                      <th className="col-hide-narrow">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {focusItems.map((item) => (
                      <tr
                        key={item.id}
                        className="clickable-row"
                        onClick={() => setSelectedEntityId(item.taskId)}
                      >
                        <td>{item.title}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <TaskStageSelect taskId={item.taskId} stage={item.stage} />
                        </td>
                        <td className="col-hide-narrow" style={{ color: "var(--steel-dim)" }}>
                          {item.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Active incidents">
            {activeIncidents.length === 0 ? (
              <div className="empty-state">No active Sev 1–2 incidents.</div>
            ) : (
              <div className="table-scroll">
                <table className="data-table data-table--sticky-first data-table--compact">
                  <thead>
                    <tr>
                      <th>Incident</th>
                      <th>Sev</th>
                      <th className="col-hide-narrow">Service</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        className="clickable-row"
                        onClick={() => setSelectedEntityId(inc.id)}
                      >
                        <td>{inc.title}</td>
                        <td>
                          <SeverityBadge severity={inc.severity} />
                        </td>
                        <td className="col-hide-narrow">{inc.serviceName}</td>
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
            <div className="empty-state">No tasks with blocking gates.</div>
          ) : (
            <div className="table-scroll">
              <table className="data-table data-table--sticky-first data-table--compact">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Stage</th>
                    <th className="col-hide-narrow">Blocking gates</th>
                  </tr>
                </thead>
                <tbody>
                  {blockingTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="clickable-row"
                      onClick={() => setSelectedEntityId(task.id)}
                    >
                      <td>{task.title}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <TaskStageSelect taskId={task.id} stage={task.stage} />
                      </td>
                      <td className="col-hide-narrow">
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
    </div>
  );
}
