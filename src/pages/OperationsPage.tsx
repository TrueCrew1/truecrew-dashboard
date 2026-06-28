import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Panel, StageBadge, StatusBadge, TaskStageSelect } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { WorkflowStage } from "@/types";

const OPEN_TASK_STAGES = new Set<WorkflowStage>([
  WorkflowStage.Inbox,
  WorkflowStage.Triage,
  WorkflowStage.Planned,
  WorkflowStage.InProgress,
  WorkflowStage.Waiting,
  WorkflowStage.Review,
]);

export function OperationsPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data, source } = useData();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter");

  const filteredTasks = useMemo(() => {
    if (filter === "open-work-orders") {
      return data.tasks.filter(
        (task) =>
          (task.workflowType === "repair" || task.workflowType === "ticket") &&
          OPEN_TASK_STAGES.has(task.stage),
      );
    }
    if (filter === "overdue-pms") {
      const now = Date.now();
      return data.tasks.filter(
        (task) =>
          task.dueAt &&
          OPEN_TASK_STAGES.has(task.stage) &&
          new Date(task.dueAt).getTime() < now,
      );
    }
    return data.tasks;
  }, [data.tasks, filter]);

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle={`All active workflows · data source: ${source}`}
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
              <th>Type</th>
              <th>Priority</th>
              <th>Stage</th>
              <th>Assignee</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
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
