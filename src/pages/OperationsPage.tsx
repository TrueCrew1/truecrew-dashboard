import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader, Panel, StageBadge, StatusBadge, TaskStageSelect } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import {
  filterTasksByShiftParam,
  SHIFT_FILTER_LABELS,
  type ShiftFilter,
} from "../../lib/queries/dashboard-stats";

function isShiftFilter(value: string | null): value is ShiftFilter {
  return value === "open-work-orders" || value === "overdue-pms";
}

export function OperationsPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data, source } = useData();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter");

  const filteredTasks = useMemo(
    () => filterTasksByShiftParam(data.tasks, filter),
    [data.tasks, filter],
  );

  const filterLabel = isShiftFilter(filter) ? SHIFT_FILTER_LABELS[filter] : null;

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle={`All active workflows · data source: ${source}`}
      />

      {filterLabel ? (
        <div className="filter-banner">
          Filtered: {filterLabel} ·{" "}
          <Link to="/operations" className="filter-banner-clear">
            Clear filter
          </Link>
        </div>
      ) : null}

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

      <Panel title={filterLabel ? `Tasks · ${filterLabel}` : "All tasks"}>
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
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">No tasks match this filter.</div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
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
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
