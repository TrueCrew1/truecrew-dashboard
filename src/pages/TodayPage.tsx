import { Link } from "react-router-dom";
import { ShiftStatsStrip } from "@/components/dashboard/ShiftStatsStrip";
import { EntityContextMeta, TaskCell } from "@/components/tasks/TaskCell";
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
import {
  isActiveIncidentStatus,
  isOpenTaskStage,
} from "../../lib/queries/dashboard-stats";

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
                    {data.focusItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`clickable-row${selectedEntityId === item.taskId ? " selected" : ""}`}
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
                    ))}
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
                  {blockingTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
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
