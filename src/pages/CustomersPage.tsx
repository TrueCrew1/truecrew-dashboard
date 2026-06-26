import { PageHeader, Panel, StageBadge, StatusBadge } from "@/components/ui";
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
                    "—"
                  )}
                </td>
                <td>{cust.healthScore}</td>
                <td style={{ color: "var(--steel-dim)" }}>{cust.primaryContact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
