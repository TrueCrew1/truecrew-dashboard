import { useMemo, useState } from "react";
import {
  PageHeader,
  Panel,
  PanelEmpty,
  PanelFilterEmpty,
  StatGrid,
  StageBadge,
  StatusBadge,
  TableScroll,
  TableText,
} from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { TaskWarningSummary } from "@/components/tasks/TaskWarningSummary";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { WorkflowStage } from "@/types";
import {
  applyTaskWarningView,
  summarizeTaskWarnings,
  TASK_WARNING_KIND_LABEL,
  taskHasWarning,
  type TaskWarningKind,
} from "../../lib/task-warnings";

export function DashboardPage() {
  const { data } = useData();
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const [warningKind, setWarningKind] = useState<TaskWarningKind | null>(null);

  const stageCounts = Object.values(WorkflowStage).reduce(
    (acc, stage) => {
      acc[stage] = data.tasks.filter((t) => t.stage === stage).length;
      return acc;
    },
    {} as Record<WorkflowStage, number>,
  );

  const activeTasks = data.tasks.filter((task) => task.stage !== WorkflowStage.Logged);
  const warningContext = useMemo(
    () => ({ customers: data.customers, workflows: data.workflows }),
    [data.customers, data.workflows],
  );
  const warningSummary = summarizeTaskWarnings(activeTasks, warningContext);
  const displayTasks = useMemo(
    () => applyTaskWarningView(activeTasks, warningKind, warningContext),
    [activeTasks, warningKind, warningContext],
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        accent="Overview"
        subtitle="Operational snapshot across workflows, services, and customers"
      />

      <div className="page-stack">
        <section className="dashboard-section" aria-labelledby="dashboard-section-now">
          <h2 id="dashboard-section-now" className="dashboard-section-title">
            Right now
          </h2>

          <StatGrid
            stats={[
              {
                label: "Active tasks",
                value: data.tasks.filter((t) => t.stage !== WorkflowStage.Logged).length,
                meta: `${stageCounts[WorkflowStage.InProgress]} in progress`,
              },
              {
                label: "Open incidents",
                value: data.incidents.filter((i) => i.status !== "resolved").length,
                meta: `${data.incidents.filter((i) => i.severity <= 2).length} Sev 1–2`,
              },
            ]}
          />

          <Panel title="Active tasks">
            <TaskWarningSummary
              summary={warningSummary}
              activeKind={warningKind}
              onKindSelect={setWarningKind}
            />
            {activeTasks.length === 0 ? (
              <PanelEmpty
                emptyKey="dashboard-tasks"
                title="No active tasks"
                description="Tasks in Logged stage are hidden from this view."
              />
            ) : displayTasks.length === 0 && warningKind ? (
              <PanelFilterEmpty
                emptyKey="dashboard-tasks-warning"
                filterLabel={TASK_WARNING_KIND_LABEL[warningKind]}
                description="No active tasks match this warning kind right now."
                clearAction={
                  <button
                    type="button"
                    className="empty-state-link"
                    onClick={() => setWarningKind(null)}
                  >
                    Clear warning filter
                  </button>
                }
              />
            ) : (
              <TableScroll>
                <table className="data-table data-table--comfortable">
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col" className="col-stage">
                        Stage
                      </th>
                      <th scope="col" className="col-type">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTasks.map((task) => (
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
                        <td>
                          <StageBadge stage={task.stage} />
                        </td>
                        <td>
                          <StatusBadge status={task.workflowType} variant="steel" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </section>

        <section className="dashboard-section" aria-labelledby="dashboard-section-today">
          <h2 id="dashboard-section-today" className="dashboard-section-title">
            Today's work
          </h2>

          <Panel title="Workflow pipeline">
            <TableScroll label="Task count by workflow stage.">
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Stage</th>
                    <th scope="col" className="col-order">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stageCounts).map(([stage, count]) => (
                    <tr key={stage}>
                      <td>
                        <StageBadge stage={stage as WorkflowStage} />
                      </td>
                      <td className={count === 0 ? "cell-muted" : undefined}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Panel>
        </section>

        <section className="dashboard-section" aria-labelledby="dashboard-section-health">
          <h2 id="dashboard-section-health" className="dashboard-section-title">
            System health
          </h2>

          <StatGrid
            stats={[
              {
                label: "Services",
                value: data.tools.length,
                meta: `${data.tools.filter((t) => t.status !== "healthy").length} degraded`,
              },
              {
                label: "Customers",
                value: data.customers.filter((c) => c.status === "active").length,
                meta: `${data.customers.filter((c) => c.status === "onboarding").length} onboarding`,
              },
            ]}
          />

          <Panel title="Recent deploys">
            {data.deploys.length === 0 ? (
              <PanelEmpty
                emptyKey="deploys"
                title="No deploys on record"
                description="Recent deploy activity will appear here once releases are tracked."
                variant="default"
              />
            ) : (
              <TableScroll label="Recent deploys table.">
                <table className="data-table data-table--comfortable">
                  <thead>
                    <tr>
                      <th scope="col" className="col-service">
                        Service
                      </th>
                      <th scope="col" className="col-stage">
                        Stage
                      </th>
                      <th scope="col" className="col-ref">
                        Version
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deploys.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <TableText value={d.serviceName} fallback="Unknown service" truncate />
                        </td>
                        <td>
                          <StageBadge stage={d.stage} />
                        </td>
                        <td>
                          <TableText value={d.version} mono />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </section>
      </div>
    </>
  );
}
