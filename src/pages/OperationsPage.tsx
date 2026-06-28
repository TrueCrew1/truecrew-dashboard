import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Panel, StageBadge, StatusBadge, TaskStageSelect } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import {
  filterOperationsTasks,
  OPERATIONS_FILTER_LABELS,
  parseOperationsFilter,
} from "../../lib/queries/dashboard-stats";

export function OperationsPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data, source } = useData();
  const [searchParams] = useSearchParams();
  const taskFilter = parseOperationsFilter(searchParams.get("filter"));
  const tasks = useMemo(
    () => filterOperationsTasks(data.tasks, taskFilter),
    [data.tasks, taskFilter],
  );
  const tasksPanelTitle = taskFilter
    ? OPERATIONS_FILTER_LABELS[taskFilter]
    : "All tasks";

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle={
          taskFilter
            ? `${OPERATIONS_FILTER_LABELS[taskFilter]} · data source: ${source}`
            : `All active workflows · data source: ${source}`
        }
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

      <Panel title={tasksPanelTitle}>
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
            {tasks.map((task) => (
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
                <td>{task.assignee ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
