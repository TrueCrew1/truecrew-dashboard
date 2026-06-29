import { PageHeader, Panel, StageBadge, StatusBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { customerMatchesSearch, getTasksForCustomer } from "@/lib/entities";

export function CustomersPage() {
  const { selectedEntityId, setSelectedEntityId, searchQuery } = useSelection();
  const { data } = useData();

  const filteredCustomers = data.customers.filter((customer) =>
    customerMatchesSearch(customer, searchQuery),
  );

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`Account records, onboarding pipelines, and health signals${
          searchQuery ? ` · ${filteredCustomers.length} match search` : ""
        }`}
      />

      <Panel title="Customer accounts">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Open tickets</th>
              <th>Onboarding stage</th>
              <th>Health</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-table-cell">
                  No customers match the current search.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const linkedTasks = getTasksForCustomer(customer, data.tasks);
                return (
                  <tr
                    key={customer.id}
                    className={`clickable-row${selectedEntityId === customer.id ? " selected" : ""}`}
                    onClick={() => setSelectedEntityId(customer.id)}
                  >
                    <td>{customer.name}</td>
                    <td>{customer.tier}</td>
                    <td>
                      <StatusBadge
                        status={customer.status}
                        variant={
                          customer.status === "active"
                            ? "green"
                            : customer.status === "onboarding"
                              ? "orange"
                              : "steel"
                        }
                      />
                    </td>
                    <td>{linkedTasks.length > 0 ? linkedTasks.length : "—"}</td>
                    <td>
                      {customer.status === "onboarding" ? (
                        <StageBadge stage={customer.stage} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{customer.healthScore}</td>
                    <td style={{ color: "var(--steel-dim)" }}>{customer.primaryContact}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
