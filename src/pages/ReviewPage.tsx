import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
} from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { TaskWarningSummary } from "@/components/tasks/TaskWarningSummary";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { isOpenTaskStage } from "../../lib/queries/dashboard-stats";
import {
  applyTaskWarningView,
  summarizeTaskWarnings,
  TASK_WARNING_KIND_LABEL,
  taskHasWarning,
  type TaskWarningKind,
} from "../../lib/task-warnings";
import { WorkflowStage } from "@/types";

export function ReviewPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();
  const [warningKind, setWarningKind] = useState<TaskWarningKind | null>(null);
  const reviewTasks = useMemo(
    () => data.tasks.filter((t) => t.stage === WorkflowStage.Review),
    [data.tasks],
  );
  const pendingDeploys = data.deploys.filter((d) => isOpenTaskStage(d.stage));
  const warningContext = useMemo(
    () => ({ customers: data.customers, workflows: data.workflows }),
    [data.customers, data.workflows],
  );
  const warningSummary = summarizeTaskWarnings(reviewTasks, warningContext);
  const displayTasks = useMemo(
    () => applyTaskWarningView(reviewTasks, warningKind, warningContext),
    [reviewTasks, warningKind, warningContext],
  );

  return (
    <>
      <PageHeader
        title="Review"
        subtitle="Items awaiting verification: code review, QA, stakeholder sign-off"
      />

      <div className="page-stack">
        <Panel title="Pending review">
          <TaskWarningSummary
            summary={warningSummary}
            activeKind={warningKind}
            onKindSelect={setWarningKind}
          />
          {reviewTasks.length === 0 ? (
            <PanelEmpty
              emptyKey="review-queue"
              title="Review queue clear"
              description="Nothing is waiting on code review, QA, or stakeholder sign-off. New items land here when tasks move to Review."
              variant="success"
              action={
                <Link to="/operations" className="empty-state-link">
                  View all tasks in Operations
                </Link>
              }
            />
          ) : displayTasks.length === 0 && warningKind ? (
            <PanelFilterEmpty
              emptyKey="review-warning-filter"
              filterLabel={TASK_WARNING_KIND_LABEL[warningKind]}
              description="No pending review tasks match this warning kind right now."
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
            <TableScroll
              wide
              stickyFirst
              label="Pending review table; scroll horizontally on smaller screens to view type, priority, and gates."
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
                    <th scope="col" className="col-gates">
                      Open gates
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
                      <td>
                        <GatesCell gates={task.gates} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title="Deploy queue">
          {pendingDeploys.length === 0 ? (
            <PanelEmpty
              emptyKey="deploy-queue"
              title={
                data.deploys.length === 0 ? "No deploys on record" : "Deploy queue clear"
              }
              description={
                data.deploys.length === 0
                  ? "Deploy workflows appear here once releases are scheduled or in flight."
                  : "All deploys are complete or archived. Planned releases will show here when scheduled."
              }
              variant={data.deploys.length === 0 ? "default" : "success"}
              action={
                <Link to="/builds" className="empty-state-link">
                  {data.deploys.length === 0 ? "Open Builds" : "Check Builds for open gates"}
                </Link>
              }
            />
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Deploy queue table; scroll horizontally on smaller screens to view service, stage, and environment."
            >
              <table className="data-table data-table--comfortable">
                <thead>
                  <tr>
                    <th scope="col">Deploy</th>
                    <th scope="col" className="col-service">
                      Service
                    </th>
                    <th scope="col" className="col-stage">
                      Stage
                    </th>
                    <th scope="col" className="col-env">
                      Environment
                    </th>
                    <th scope="col" className="col-ref">
                      Version
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDeploys.map((d) => (
                    <tr
                      key={d.id}
                      className={`clickable-row${selectedEntityId === d.id ? " selected" : ""}`}
                      onClick={() => setSelectedEntityId(d.id)}
                    >
                      <td className="cell-truncate" title={d.title}>
                        {d.title}
                      </td>
                      <td>
                        <TableText value={d.serviceName} fallback="Unknown service" />
                      </td>
                      <td>
                        <StageBadge stage={d.stage} />
                      </td>
                      <td>
                        <TableText value={d.environment} />
                      </td>
                      <td>
                        <TableText value={d.version} mono truncate />
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
