import { mockData } from "@/data/mockData";
import { PageHeader, Panel, StageBadge } from "@/components/ui";
import { WorkflowStage } from "@/types";

export function ReviewPage() {
  const reviewItems = [
    ...mockData.tasks.filter((t) => t.stage === WorkflowStage.Review),
    ...mockData.deploys.filter((d) => d.stage === WorkflowStage.Review),
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
              {mockData.tasks
                .filter((t) => t.stage === WorkflowStage.Review)
                .map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
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
            {mockData.deploys.map((d) => (
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
