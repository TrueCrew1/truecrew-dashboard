import { EmptyState, PageHeader, Panel, StageBadge, StatusBadge, TaskStageSelect } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";

function isWorkflowSelected(
  selectedEntityId: string | null,
  workflowId: string,
  linkedTaskId?: string,
): boolean {
  if (!selectedEntityId) return false;
  return selectedEntityId === workflowId || selectedEntityId === linkedTaskId;
}

export function OperationsPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data, source } = useData();

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle={`Active workflows and tasks · source: ${source}`}
      />

      <div className="page-stack">
        <Panel title="Active workflows">
          {data.workflows.length === 0 ? (
            <EmptyState>No active workflows.</EmptyState>
          ) : (
            <div className="table-scroll">
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
                    const linkedTaskId = wf.linkedTaskIds[0];
                    const selectionId = linkedTaskId ?? wf.id;
                    const blocking = wf.gates.filter((g) => g.required && !g.passed).length;

                    return (
                      <tr
                        key={wf.id}
                        className={`clickable-row${
                          isWorkflowSelected(selectedEntityId, wf.id, linkedTaskId) ? " selected" : ""
                        }`}
                        onClick={() => setSelectedEntityId(selectionId)}
                      >
                        <td>{wf.title}</td>
                        <td>
                          <StatusBadge status={wf.type} variant="steel" />
                        </td>
                        <td>
                          <StageBadge stage={wf.stage} />
                        </td>
                        <td>{wf.owner}</td>
                        <td className={blocking > 0 ? "cell-warning" : "cell-success"}>
                          {blocking > 0 ? `${blocking} blocking` : "Clear"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="All tasks">
          {data.tasks.length === 0 ? (
            <EmptyState>No tasks yet.</EmptyState>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Stage</th>
                    <th>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                      onClick={() => setSelectedEntityId(task.id)}
                    >
                      <td>{task.title}</td>
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
                      <td className="cell-muted">{task.assignee ?? "—"}</td>
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
