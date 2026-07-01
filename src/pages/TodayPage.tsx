import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShiftStatsStrip } from "@/components/dashboard/ShiftStatsStrip";
import { EntityContextMeta, TaskCell } from "@/components/tasks/TaskCell";
import { TaskWarningSummary } from "@/components/tasks/TaskWarningSummary";
import {
  GatesCell,
  PageHeader,
  Panel,
  PanelEmpty,
  PanelFilterEmpty,
  SeverityBadge,
  TableScroll,
  TableText,
  TaskStageSelect,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import {
  isActiveIncidentStatus,
  isOpenTaskStage,
} from "../../lib/queries/dashboard-stats";
import {
  filterTasksByWarningKind,
  summarizeTaskWarnings,
  TASK_WARNING_KIND_LABEL,
  taskHasWarning,
  taskMatchesWarningKind,
  type TaskWarningKind,
} from "../../lib/task-warnings";

export function TodayPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();
  const [focusWarningKind, setFocusWarningKind] = useState<TaskWarningKind | null>(null);
  const [gateWarningKind, setGateWarningKind] = useState<TaskWarningKind | null>(null);

  const activeIncidents = data.incidents.filter(
    (i) => i.severity <= 2 && isActiveIncidentStatus(i.status),
  );
  const blockingTasks = data.tasks.filter(
    (t) =>
      isOpenTaskStage(t.stage) &&
      t.gates.some((g) => g.required && !g.passed),
  );
  const warningContext = useMemo(
    () => ({ customers: data.customers, workflows: data.workflows }),
    [data.customers, data.workflows],
  );
  const tasksById = useMemo(
    () => new Map(data.tasks.map((task) => [task.id, task])),
    [data.tasks],
  );
  const focusTaskList = data.focusItems
    .map((item) => tasksById.get(item.taskId))
    .filter((task): task is NonNullable<typeof task> => Boolean(task));
  const focusWarningSummary = summarizeTaskWarnings(focusTaskList, warningContext);
  const displayFocusItems = useMemo(() => {
    if (!focusWarningKind) return data.focusItems;
    return data.focusItems.filter((item) => {
      const task = tasksById.get(item.taskId);
      return task && taskMatchesWarningKind(task, focusWarningKind, warningContext);
    });
  }, [data.focusItems, tasksById, focusWarningKind, warningContext]);
  const gateWarningSummary = summarizeTaskWarnings(blockingTasks, warningContext);
  const displayBlockingTasks = useMemo(
    () => filterTasksByWarningKind(blockingTasks, gateWarningKind, warningContext),
    [blockingTasks, gateWarningKind, warningContext],
  );

  return (
    <>
      <PageHeader
        title="Today"
        subtitle="Focus items, overdue gates, and active Sev 1–2 incidents"
      />

      <ShiftStatsStrip />

      <div className="page-stack">
        <div className="grid-2">
          <Panel title="Focus queue">
            <TaskWarningSummary
              summary={focusWarningSummary}
              activeKind={focusWarningKind}
              onKindSelect={setFocusWarningKind}
            />
            {data.focusItems.length === 0 ? (
              <PanelEmpty
                emptyKey="focus"
                title="Focus queue clear"
                description="No items need immediate operator attention right now."
                variant="success"
                action={
                  <Link to="/operations" className="empty-state-link">
                    View all tasks
                  </Link>
                }
              />
            ) : displayFocusItems.length === 0 && focusWarningKind ? (
              <PanelFilterEmpty
                emptyKey="focus-warning-filter"
                filterLabel={TASK_WARNING_KIND_LABEL[focusWarningKind]}
                description={`No focus items match the ${TASK_WARNING_KIND_LABEL[focusWarningKind]} warning right now.`}
                clearAction={
                  <button
                    type="button"
                    className="empty-state-link"
                    onClick={() => setFocusWarningKind(null)}
                  >
                    Clear warning filter
                  </button>
                }
              />
            ) : (
              <TableScroll
                wide
                stickyFirst
                label="Focus queue table; scroll horizontally on smaller screens to view stage and reason columns."
              >
                <table className="data-table data-table--comfortable">
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col" className="col-stage">
                        Stage
                      </th>
                      <th scope="col">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayFocusItems.map((item) => {
                      const focusTask = tasksById.get(item.taskId);
                      return (
                      <tr
                        key={item.id}
                        className={[
                          "clickable-row",
                          selectedEntityId === item.taskId ? "selected" : "",
                          focusTask && taskHasWarning(focusTask, warningContext)
                            ? "task-row--warned"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setSelectedEntityId(item.taskId)}
                      >
                        <td>
                          <EntityContextMeta entityId={item.taskId} title={item.title} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <TaskStageSelect taskId={item.taskId} stage={item.stage} />
                        </td>
                        <td>
                          <TableText value={item.reason} className="cell-muted" truncate />
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>

          <Panel title="Active incidents">
            {activeIncidents.length === 0 ? (
              <PanelEmpty
                emptyKey="incidents"
                title="No Sev 1–2 incidents"
                description="No critical or high-severity incidents are open."
                variant="success"
                action={
                  <Link to="/monitor" className="empty-state-link">
                    Open Monitor
                  </Link>
                }
              />
            ) : (
              <TableScroll
                wide
                stickyFirst
                label="Active incidents table; scroll horizontally on smaller screens to view severity and service columns."
              >
                <table className="data-table data-table--comfortable">
                  <thead>
                    <tr>
                      <th scope="col">Incident</th>
                      <th scope="col" className="col-order">
                        Sev
                      </th>
                      <th scope="col" className="col-service">
                        Service
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        className={`clickable-row${selectedEntityId === inc.id ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(inc.id)}
                      >
                        <td className="cell-truncate" title={inc.title}>
                          {inc.title}
                        </td>
                        <td>
                          <SeverityBadge severity={inc.severity} />
                        </td>
                        <td>
                          <TableText value={inc.serviceName} fallback="Unknown service" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </div>

        <Panel title="Blocking gates">
          <TaskWarningSummary
            summary={gateWarningSummary}
            activeKind={gateWarningKind}
            onKindSelect={setGateWarningKind}
          />
          {blockingTasks.length === 0 ? (
            <PanelEmpty
              emptyKey="gates"
              title="All gates passed"
              description="No open required gates are blocking active task progress."
              variant="success"
              action={
                <Link to="/operations" className="empty-state-link">
                  Review all workflows
                </Link>
              }
            />
          ) : displayBlockingTasks.length === 0 && gateWarningKind ? (
            <PanelFilterEmpty
              emptyKey="gates-warning-filter"
              filterLabel={TASK_WARNING_KIND_LABEL[gateWarningKind]}
              description={`No blocking gate tasks match the ${TASK_WARNING_KIND_LABEL[gateWarningKind]} warning right now.`}
              clearAction={
                <button
                  type="button"
                  className="empty-state-link"
                  onClick={() => setGateWarningKind(null)}
                >
                  Clear warning filter
                </button>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Blocking gates table; scroll horizontally on smaller screens to view stage and gate details."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-gates">
                      Blocking gates
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayBlockingTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={[
                        "clickable-row",
                        selectedEntityId === task.id ? "selected" : "",
                        taskHasWarning(task, warningContext) ? "task-row--warned" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedEntityId(task.id)}
                    >
                      <td>
                        <TaskCell task={task} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <TaskStageSelect taskId={task.id} stage={task.stage} />
                      </td>
                      <td>
                        <GatesCell gates={task.gates} clearLabel="None" />
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
