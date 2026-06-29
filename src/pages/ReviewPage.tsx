import { CustomerContextCell, PageHeader, Panel, StageBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { getCustomerLabel, getLinkedCustomer, taskMatchesSearch } from "@/lib/entities";
import { WorkflowStage } from "@/types";

export function ReviewPage() {
  const { selectedEntityId, setSelectedEntityId, searchQuery } = useSelection();
  const { data } = useData();

  const reviewTasks = data.tasks
    .filter((task) => task.stage === WorkflowStage.Review)
    .filter((task) => taskMatchesSearch(task, data.customers, searchQuery));

  const reviewDeploys = data.deploys.filter((deploy) => deploy.stage === WorkflowStage.Review);

  return (
    <>
      <PageHeader
        title="Review"
        subtitle="Items awaiting verification: code review, QA, stakeholder sign-off"
      />

      <Panel title="Pending review">
        {reviewTasks.length === 0 && reviewDeploys.length === 0 ? (
          <div className="empty-state">No items in review stage.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {reviewTasks.map((task) => {
                const customer = getLinkedCustomer(task, data.customers);
                return (
                  <tr
                    key={task.id}
                    className={`clickable-row${selectedEntityId === task.id ? " selected" : ""}`}
                    onClick={() => setSelectedEntityId(task.id)}
                  >
                    <td>{task.title}</td>
                    <td>
                      <CustomerContextCell
                        name={getCustomerLabel(task, data.customers)}
                        tier={customer?.tier}
                      />
                    </td>
                    <td>{task.workflowType}</td>
                    <td>
                      <StageBadge stage={task.stage} />
                    </td>
                  </tr>
                );
              })}
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
            {data.deploys.map((deploy) => (
              <tr key={deploy.id}>
                <td>{deploy.title}</td>
                <td>{deploy.serviceName}</td>
                <td>
                  <StageBadge stage={deploy.stage} />
                </td>
                <td>{deploy.environment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
