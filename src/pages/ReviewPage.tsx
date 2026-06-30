import { Link } from "react-router-dom";
import {
  EmptyState,
  PageHeader,
  Panel,
  StageBadge,
  StatusBadge,
  TableScroll,
} from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { isOpenTaskStage } from "../../lib/queries/dashboard-stats";
import { WorkflowStage } from "@/types";

export function ReviewPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();
  const reviewTasks = data.tasks.filter((t) => t.stage === WorkflowStage.Review);
  const pendingDeploys = data.deploys.filter((d) => isOpenTaskStage(d.stage));

  return (
    <>
      <PageHeader
        title="Review"
        subtitle="Items awaiting verification: code review, QA, stakeholder sign-off"
      />

      <div className="page-stack">
        <Panel title="Pending review">
          {reviewTasks.length === 0 ? (
            <div className="panel-empty" data-empty="review-queue" role="status">
              <EmptyState
                title="Review queue clear"
                description="Nothing is waiting on code review, QA, or stakeholder sign-off. New items land here when tasks move to Review."
                variant="success"
                action={
                  <Link to="/operations" className="empty-state-link">
                    View all tasks in Operations
                  </Link>
                }
              />
            </div>
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Pending review table; scroll horizontally on smaller screens to view type, priority, and gates."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Open gates</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewTasks.map((task) => {
                    const openGates = task.gates.filter((g) => g.required && !g.passed);
                    return (
                      <tr
                        key={task.id}
                        className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(task.id)}
                      >
                        <td>
                          <TaskCell task={task} />
                        </td>
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
                        <td
                          className={
                            openGates.length > 0 ? "cell-warning cell-truncate" : "cell-success"
                          }
                          title={
                            openGates.length > 0
                              ? openGates.map((g) => g.label).join(" · ")
                              : undefined
                          }
                        >
                          {openGates.length > 0
                            ? openGates.map((g) => g.label).join(" · ")
                            : "Clear"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title="Deploy queue">
          {pendingDeploys.length === 0 ? (
            <div className="panel-empty" data-empty="deploy-queue" role="status">
              <EmptyState
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
            </div>
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Deploy queue table; scroll horizontally on smaller screens to view service, stage, and environment."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Deploy</th>
                    <th>Service</th>
                    <th>Stage</th>
                    <th>Environment</th>
                    <th>Version</th>
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
                      <td>{d.serviceName}</td>
                      <td>
                        <StageBadge stage={d.stage} />
                      </td>
                      <td>{d.environment}</td>
                      <td className="cell-mono cell-truncate" title={d.version}>
                        {d.version}
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
