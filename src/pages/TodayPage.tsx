import { PageHeader, Panel, StageBadge, SeverityBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";

export function TodayPage() {
  const { setSelectedEntityId } = useSelection();
  const { data } = useData();

  return (
    <>
      <PageHeader
        title="Today"
        subtitle="Focus items, overdue gates, and active Sev 1–2 incidents"
      />

      <div className="grid-2">
        <Panel title="Focus queue">
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
                  className="clickable-row"
                  onClick={() => setSelectedEntityId(item.taskId)}
                >
                  <td>{item.title}</td>
                  <td>
                    <StageBadge stage={item.stage} />
                  </td>
                  <td style={{ color: "var(--steel-dim)" }}>{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Active incidents">
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Sev</th>
                <th>Service</th>
              </tr>
            </thead>
            <tbody>
              {data.incidents
                .filter((i) => i.severity <= 2)
                .map((inc) => (
                  <tr
                    key={inc.id}
                    className="clickable-row"
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
        </Panel>
      </div>

      <Panel title="Blocking gates">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Stage</th>
              <th>Blocking gates</th>
            </tr>
          </thead>
          <tbody>
            {data.tasks
              .filter((t) => t.gates.some((g) => g.required && !g.passed))
              .map((task) => (
                <tr
                  key={task.id}
                  className="clickable-row"
                  onClick={() => setSelectedEntityId(task.id)}
                >
                  <td>{task.title}</td>
                  <td>
                    <StageBadge stage={task.stage} />
                  </td>
                  <td>
                    {task.gates
                      .filter((g) => g.required && !g.passed)
                      .map((g) => g.label)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
