import { PageHeader, Panel, StageBadge } from "@/components/ui";
import { TaskCell } from "@/components/tasks/TaskCell";
import { useData } from "@/context/DataContext";
import { WorkflowStage } from "@/types";

export function ReviewPage() {
  const { data } = useData();
  const reviewItems = [
    ...data.tasks.filter((t) => t.stage === WorkflowStage.Review),
    ...data.deploys.filter((d) => d.stage === WorkflowStage.Review),
  ];

  return (
    <>
      <PageHeader
        title="Review"
        subtitle="Items awaiting verification: code review, QA, stakeholder sign-off"
      />

      <Panel title="Pending review">
        {reviewItems.length === 0 ? (
          <div className="empty-state">No items in review stage.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {data.tasks
                .filter((t) => t.stage === WorkflowStage.Review)
                .map((task) => (
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
        )}
      </Panel>

      <Panel title="Deploy queue">
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
      </Panel>
    </>
  );
}
