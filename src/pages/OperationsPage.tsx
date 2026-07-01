import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  GatesCell,
  PageHeader,
  Panel,
  PanelEmpty,
  PanelFilterEmpty,
  StageBadge,
  StatusBadge,
  TableScroll,
  TableText,
  TaskStageSelect,
} from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { formatDataSourceLabel } from "@/lib/api/client";
import {
  filterTasksByShiftParam,
  isOpenTaskStage,
  SHIFT_FILTER_LABELS,
  type ShiftFilter,
} from "../../lib/queries/dashboard-stats";

function isShiftFilter(value: string | null): value is ShiftFilter {
  return value === "open-work-orders" || value === "overdue-pms";
}

type OperationsTaskFilter = Exclude<ShiftFilter, "active-incidents">;

const FILTER_EMPTY_COPY: Record<OperationsTaskFilter, string> = {
  "open-work-orders":
    "This filter shows repair and ticket tasks in open stages. None match right now.",
  "overdue-pms":
    "This filter shows open tasks past their due date. Nothing is overdue at the moment.",
};

export function OperationsPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data, source } = useData();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter");

  const activeWorkflows = useMemo(
    () => data.workflows.filter((wf) => isOpenTaskStage(wf.stage)),
    [data.workflows],
  );

  const filteredTasks = useMemo(
    () => filterTasksByShiftParam(data.tasks, filter),
    [data.tasks, filter],
  );

  const filterLabel = isShiftFilter(filter) ? SHIFT_FILTER_LABELS[filter] : null;

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle={`Active workflows and tasks · data source: ${formatDataSourceLabel(source)}`}
      />

      {filterLabel ? (
        <div className="filter-banner" role="status">
          Filtered: {filterLabel} ·{" "}
          <Link to="/operations" className="filter-banner-clear">
            Clear filter
          </Link>
        </div>
      ) : null}

      <div className="page-stack">
        <Panel title="Active workflows">
          {activeWorkflows.length === 0 ? (
            <PanelEmpty
              emptyKey="workflows"
              title={
                data.workflows.length === 0
                  ? "No workflows yet"
                  : "No active workflows"
              }
              description={
                data.workflows.length === 0
                  ? "Workflows appear here when builds, deploys, repairs, or onboarding pipelines are in flight."
                  : "All workflows are closed or archived. Nothing is in an open stage right now."
              }
              variant={data.workflows.length === 0 ? "default" : "success"}
              action={
                <Link to="/" className="empty-state-link">
                  Return to Today
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Active workflows table; scroll horizontally on smaller screens to view type, stage, owner, and gates."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Workflow</th>
                    <th scope="col" className="col-type">
                      Type
                    </th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-owner">
                      Owner
                    </th>
                    <th scope="col" className="col-gates">
                      Open gates
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeWorkflows.map((wf) => (
                    <tr
                      key={wf.id}
                      className={`clickable-row${selectedEntityId === wf.linkedTaskIds[0] ? " selected" : ""}`}
                      onClick={() => setSelectedEntityId(wf.linkedTaskIds[0] ?? wf.id)}
                    >
                      <td className="cell-truncate" title={wf.title}>
                        {wf.title}
                      </td>
                      <td>
                        <StatusBadge status={wf.type} variant="steel" />
                      </td>
                      <td>
                        <StageBadge stage={wf.stage} />
                      </td>
                      <td>
                        <TableText value={wf.owner} fallback="Unassigned" />
                      </td>
                      <td>
                        <GatesCell gates={wf.gates} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title={filterLabel ? `Tasks · ${filterLabel}` : "All tasks"}>
          {data.tasks.length === 0 ? (
            <PanelEmpty
              emptyKey="tasks"
              title="No tasks yet"
              description="Tasks are created from workflows and will show up here once work begins."
            />
          ) : filteredTasks.length === 0 && filterLabel ? (
            <PanelFilterEmpty
              emptyKey="tasks-filter"
              filterLabel={filterLabel}
              description={FILTER_EMPTY_COPY[filter as OperationsTaskFilter]}
              clearAction={
                <Link to="/operations" className="empty-state-link">
                  Clear filter and show all tasks
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Tasks table; scroll horizontally on smaller screens to view type, priority, stage, and assignee."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col" className="col-type">
                      Type
                    </th>
                    <th scope="col" className="col-priority">
                      Priority
                    </th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-owner">
                      Assignee
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                      onClick={() => setSelectedEntityId(task.id)}
                    >
                      <td>
                        <TaskCell task={task} />
                      </td>
                      <td>
                        <StatusBadge status={task.workflowType} variant="steel" />
                      </td>
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
                      <td>
                        <TableText value={task.assignee} fallback="Unassigned" />
                      </td>
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
