import { Link } from "react-router-dom";
import { EmptyState, PageHeader, Panel, StageBadge, StatusBadge, TableScroll } from "@/components/ui";
import { useData } from "@/context/DataContext";

export function CustomersPage() {
  const { data } = useData();

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Account records, onboarding pipelines, and health signals"
      />

      <Panel title="Customer accounts">
        {data.customers.length === 0 ? (
          <EmptyState
            title="No customer accounts"
            description="Customer records appear here after onboarding begins or accounts are imported."
            action={
              <Link to="/operations" className="empty-state-link">
                View active workflows
              </Link>
            }
          />
        ) : (
          <TableScroll wide>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Onboarding stage</th>
                  <th>Health</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((cust) => (
                  <tr key={cust.id}>
                    <td>{cust.name}</td>
                    <td>{cust.tier}</td>
                    <td>
                      <StatusBadge
                        status={cust.status}
                        variant={
                          cust.status === "active"
                            ? "green"
                            : cust.status === "onboarding"
                              ? "orange"
                              : "steel"
                        }
                      />
                    </td>
                    <td>
                      {cust.status === "onboarding" ? (
                        <StageBadge stage={cust.stage} />
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td>{cust.healthScore}</td>
                    <td className="cell-muted">{cust.primaryContact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
    </>
  );
}
