import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  EmptyState,
  PageHeader,
  Panel,
  StageBadge,
  StatusBadge,
  TableScroll,
  TaskStageSelect,
} from "@/components/ui";
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

const FILTER_EMPTY_COPY: Record<ShiftFilter, string> = {
  "open-work-orders":
    "This filter shows repair and ticket tasks in open stages. None match right now.",
  "overdue-pms":
    "This filter shows open tasks past their due date. Nothing is overdue at the moment.",
  "active-incidents": "",
};

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

      <div className="page-stack">
        <Panel title="Active workflows">
          {data.workflows.length === 0 ? (
            <EmptyState
              title="No active workflows"
              description="Workflows appear here when builds, deploys, repairs, or onboarding pipelines are in flight."
              action={
                <Link to="/" className="empty-state-link">
                  Return to Today
                </Link>
              }
            />
          ) : (
            <TableScroll>
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
                        <td className={blocking > 0 ? "cell-warning" : "cell-success"}>
                          {blocking > 0 ? `${blocking} blocking` : "Clear"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title={filterLabel ? `Tasks · ${filterLabel}` : "All tasks"}>
          {data.tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Tasks are created from workflows and will show up here once work begins."
            />
          ) : filteredTasks.length === 0 && filterLabel ? (
            <EmptyState
              title={`No tasks match “${filterLabel}”`}
              description={FILTER_EMPTY_COPY[filter as ShiftFilter]}
              variant="filter"
              action={
                <Link to="/operations" className="empty-state-link">
                  Clear filter and show all tasks
                </Link>
              }
            />
          ) : (
            <TableScroll>
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
                      <td className="cell-muted">{task.assignee ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </>
  );
}
