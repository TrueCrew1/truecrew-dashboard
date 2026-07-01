import { Link } from "react-router-dom";
import {
  PageHeader,
  Panel,
  PanelEmpty,
  StageBadge,
  StatusBadge,
  TableScroll,
  TableText,
} from "@/components/ui";
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
          <PanelEmpty
            emptyKey="customers"
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
            <table className="data-table data-table--comfortable">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col" className="col-type">
                    Tier
                  </th>
                  <th scope="col" className="col-stage">
                    Status
                  </th>
                  <th scope="col" className="col-stage">
                    Onboarding stage
                  </th>
                  <th scope="col" className="col-order">
                    Health
                  </th>
                  <th scope="col">Contact</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((cust) => (
                  <tr key={cust.id}>
                    <td className="cell-truncate" title={cust.name}>
                      {cust.name}
                    </td>
                    <td>
                      <StatusBadge status={cust.tier} variant="steel" />
                    </td>
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
                        <TableText value={null} fallback="Not onboarding" />
                      )}
                    </td>
                    <td>{cust.healthScore}</td>
                    <td>
                      <TableText value={cust.primaryContact} className="cell-muted" />
                    </td>
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
