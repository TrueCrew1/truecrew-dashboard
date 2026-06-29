import {
  CustomerContextCell,
  PageHeader,
  Panel,
  StageBadge,
  StatusBadge,
  TaskStageSelect,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { getCustomerLabel, getLinkedCustomer, taskMatchesSearch } from "@/lib/entities";

export function OperationsPage() {
  const { selectedEntityId, setSelectedEntityId, searchQuery } = useSelection();
  const { data, source } = useData();

  const filteredTasks = data.tasks.filter((task) =>
    taskMatchesSearch(task, data.customers, searchQuery),
  );

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle={`All active workflows · data source: ${source}${
          searchQuery ? ` · ${filteredTasks.length} tasks match search` : ""
        }`}
      />

      <Panel title="Active workflows">
        <table className="data-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Type</th>
              <th>Stage</th>
              <th>Owner</th>
              <th>Gates</th>
            </tr>
          </thead>
          <tbody>
            {data.workflows.map((wf) => {
              const blocking = wf.gates.filter((g) => g.required && !g.passed).length;
              return (
                <tr
                  key={wf.id}
                  className={`clickable-row${selectedEntityId === wf.linkedTaskIds[0] ? " selected" : ""}`}
                  onClick={() => setSelectedEntityId(wf.linkedTaskIds[0] ?? wf.id)}
                >
                  <td>{wf.title}</td>
                  <td>
                    <StatusBadge status={wf.type} variant="steel" />
                  </td>
                  <td>
                    <StageBadge stage={wf.stage} />
                  </td>
                  <td>{wf.owner}</td>
                  <td style={{ color: blocking ? "var(--orange)" : "var(--green)" }}>
                    {blocking > 0 ? `${blocking} blocking` : "Clear"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel title="All tasks">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Stage</th>
              <th>Assignee</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  No tasks match the current search.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const customer = getLinkedCustomer(task, data.customers);
                return (
                  <tr
                    key={task.id}
                    className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                    onClick={() => setSelectedEntityId(task.id)}
                  >
                    <td>{task.title}</td>
                    <td>
                      <CustomerContextCell
                        name={getCustomerLabel(task, data.customers)}
                        tier={customer?.tier}
                      />
                    </td>
                    <td>{task.workflowType}</td>
                    <td>
                      <StatusBadge
                        status={task.priority}
                        variant={
                          task.priority === "critical"
                            ? "red"
                            : task.priority === "high"
                              ? "orange"
                              : "steel"
                        }
                      />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <TaskStageSelect taskId={task.id} stage={task.stage} />
                    </td>
                    <td>{task.assignee ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
