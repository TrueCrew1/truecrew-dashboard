import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ShiftStatsStrip } from "@/components/dashboard/ShiftStatsStrip";
import { EntityContextMeta, TaskCell } from "@/components/tasks/TaskCell";
import { TaskWarningSummary } from "@/components/tasks/TaskWarningSummary";
import {
  GatesCell,
  PageHeader,
  Panel,
  PanelEmpty,
  SeverityBadge,
  TableScroll,
  TableText,
  TaskStageSelect,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import type { FocusItem } from "@/types";
import {
  isActiveIncidentStatus,
  isOpenTaskStage,
} from "../../lib/queries/dashboard-stats";
import { taskHasWarning } from "../../lib/task-warnings";
import {
  TodayWarningFilterEmpty,
  useTodayPanelWarningFilter,
  useTodayTaskPanelWarningFilter,
} from "./todayWarningPanel";

export function TodayPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();

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
  const resolveFocusTask = useMemo(
    () => (item: FocusItem) => tasksById.get(item.taskId),
    [tasksById],
  );
  const focusPanel = useTodayPanelWarningFilter(
    data.focusItems,
    warningContext,
    resolveFocusTask,
  );
  const gatePanel = useTodayTaskPanelWarningFilter(blockingTasks, warningContext);

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
              summary={focusPanel.warningSummary}
              activeKind={focusPanel.warningKind}
              onKindSelect={focusPanel.setWarningKind}
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
            ) : focusPanel.displayItems.length === 0 && focusPanel.warningKind ? (
              <TodayWarningFilterEmpty
                emptyKey="focus-warning-filter"
                warningKind={focusPanel.warningKind}
                itemLabel="focus items"
                onClear={() => focusPanel.setWarningKind(null)}
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
                    {focusPanel.displayItems.map((item) => {
                      const focusTask = resolveFocusTask(item);
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
            summary={gatePanel.warningSummary}
            activeKind={gatePanel.warningKind}
            onKindSelect={gatePanel.setWarningKind}
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
          ) : gatePanel.displayItems.length === 0 && gatePanel.warningKind ? (
            <TodayWarningFilterEmpty
              emptyKey="gates-warning-filter"
              warningKind={gatePanel.warningKind}
              itemLabel="blocking gate tasks"
              onClear={() => gatePanel.setWarningKind(null)}
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
                  {gatePanel.displayItems.map((task) => (
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
