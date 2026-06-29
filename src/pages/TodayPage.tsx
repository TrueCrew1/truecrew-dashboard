import { CustomerContextCell, PageHeader, Panel, SeverityBadge, TaskStageSelect } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { getCustomerLabel, getLinkedCustomer, matchesSearch, taskMatchesSearch } from "@/lib/entities";

export function TodayPage() {
  const { setSelectedEntityId, searchQuery } = useSelection();
  const { data } = useData();

  const taskById = new Map(data.tasks.map((task) => [task.id, task]));

  const filteredFocusItems = data.focusItems.filter((item) => {
    const task = taskById.get(item.taskId);
    if (!task) return matchesSearch(item.title, searchQuery);
    return taskMatchesSearch(task, data.customers, searchQuery);
  });

  const filteredBlockingTasks = data.tasks
    .filter((task) => task.gates.some((gate) => gate.required && !gate.passed))
    .filter((task) => taskMatchesSearch(task, data.customers, searchQuery));

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
                <th>Customer</th>
                <th>Stage</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredFocusItems.map((item) => {
                const task = taskById.get(item.taskId);
                const customer = task ? getLinkedCustomer(task, data.customers) : undefined;
                return (
                  <tr
                    key={item.id}
                    className="clickable-row"
                    onClick={() => setSelectedEntityId(item.taskId)}
                  >
                    <td>{item.title}</td>
                    <td>
                      {task ? (
                        <CustomerContextCell
                          name={getCustomerLabel(task, data.customers)}
                          tier={customer?.tier}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <TaskStageSelect taskId={item.taskId} stage={item.stage} />
                    </td>
                    <td style={{ color: "var(--steel-dim)" }}>{item.reason}</td>
                  </tr>
                );
              })}
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
              <th>Customer</th>
              <th>Stage</th>
              <th>Blocking gates</th>
            </tr>
          </thead>
          <tbody>
            {filteredBlockingTasks.map((task) => {
              const customer = getLinkedCustomer(task, data.customers);
              return (
                <tr
                  key={task.id}
                  className="clickable-row"
                  onClick={() => setSelectedEntityId(task.id)}
                >
                  <td>{task.title}</td>
                  <td>
                    <CustomerContextCell
                      name={getCustomerLabel(task, data.customers)}
                      tier={customer?.tier}
                    />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <TaskStageSelect taskId={task.id} stage={task.stage} />
                  </td>
                  <td>
                    {task.gates
                      .filter((gate) => gate.required && !gate.passed)
                      .map((gate) => gate.label)
                      .join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
