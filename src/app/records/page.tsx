"use client";

import { PageHeader, Panel, StatGrid, StatusBadge, formatRelativeTime } from "@/components/ui";
import { useData } from "@/context/DataContext";

export default function RecordsPage() {
  const { data } = useData();

  const activeCustomers = data.customers.filter((c) => c.status === "active").length;
  const runbooks = data.runbooks.length;
  const notes = data.notes.length;

  return (
    <>
      <PageHeader
        title="Records"
        subtitle="Customers, runbooks, knowledge notes, and operational documentation"
      />

      <StatGrid
        stats={[
          {
            label: "Customers",
            value: data.customers.length,
            meta: `${activeCustomers} active accounts`,
          },
          { label: "Runbooks", value: runbooks, meta: "Operational playbooks" },
          { label: "Notes", value: notes, meta: "Knowledge base entries" },
          { label: "Prompts", value: data.prompts.length, meta: "AI prompt library" },
        ]}
      />

      <div className="grid-2">
        <Panel title="Customer registry">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>
                    <StatusBadge
                      status={customer.status}
                      variant={
                        customer.status === "active"
                          ? "green"
                          : customer.status === "onboarding"
                            ? "blue"
                            : "steel"
                      }
                    />
                  </td>
                  <td style={{ color: "var(--steel-dim)" }}>{customer.tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Runbooks">
          <table className="data-table">
            <thead>
              <tr>
                <th>Runbook</th>
                <th>Service</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.runbooks.map((runbook) => (
                <tr key={runbook.id}>
                  <td>{runbook.title}</td>
                  <td style={{ color: "var(--steel-dim)" }}>{runbook.serviceName}</td>
                  <td className="mono">{formatRelativeTime(runbook.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Knowledge notes">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.notes.map((note) => (
              <tr key={note.id}>
                <td>{note.title}</td>
                <td style={{ color: "var(--steel-dim)" }}>{note.type}</td>
                <td className="mono">{formatRelativeTime(note.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
