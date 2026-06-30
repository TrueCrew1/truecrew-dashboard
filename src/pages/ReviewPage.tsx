import { Link } from "react-router-dom";
import { EmptyState, PageHeader, Panel, StageBadge } from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { useData } from "@/context/DataContext";
import { WorkflowStage } from "@/types";

const REVIEW_TABLE = "table-scroll table-scroll--wide table-scroll--sticky-first";

export function ReviewPage() {
  const { data } = useData();
  const reviewTasks = data.tasks.filter((t) => t.stage === WorkflowStage.Review);

  return (
    <>
      <PageHeader
        title="Review"
        subtitle="Items awaiting verification: code review, QA, stakeholder sign-off"
      />

      <div className="page-stack">
      <Panel title="Pending review">
        {reviewTasks.length === 0 ? (
          <div className="panel-empty" data-empty="gates" role="status">
            <EmptyState
              title="Review queue clear"
              description="Nothing is waiting on code review, QA, or stakeholder sign-off."
              variant="success"
              action={
                <Link to="/operations" className="empty-state-link">
                  Open Operations
                </Link>
              }
            />
          </div>
        ) : (
          <div className={REVIEW_TABLE}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {reviewTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <TaskCell task={task} />
                    </td>
                    <td>{task.workflowType}</td>
                    <td>
                      <StageBadge stage={task.stage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Deploy queue">
        {data.deploys.length === 0 ? (
          <div className="panel-empty" data-empty="workflows" role="status">
            <EmptyState
              title="No deploys on record"
              description="Deploy workflows appear here once releases are scheduled or in flight."
              action={
                <Link to="/operations" className="empty-state-link">
                  Open Operations
                </Link>
              }
            />
          </div>
        ) : (
          <div className={REVIEW_TABLE}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Deploy</th>
                  <th>Service</th>
                  <th>Stage</th>
                  <th>Environment</th>
                </tr>
              </thead>
              <tbody>
                {data.deploys.map((d) => (
                  <tr key={d.id}>
                    <td>{d.title}</td>
                    <td>{d.serviceName}</td>
                    <td>
                      <StageBadge stage={d.stage} />
                    </td>
                    <td>{d.environment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      </div>
    </>
  );
}
