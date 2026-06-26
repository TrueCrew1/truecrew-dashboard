"use client";

import { PageHeader, Panel, StatGrid, StageBadge, StatusBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { WorkflowStage } from "@/types";

export default function CommandCenterPage() {
  const { data, source, loading } = useData();

  const activeTasks = data.tasks.filter((t) => t.stage !== WorkflowStage.Logged).length;
  const openIncidents = data.incidents.filter((i) => i.status !== "resolved").length;
  const degradedServices = data.tools.filter((t) => t.status !== "healthy").length;

  return (
    <>
      <PageHeader
        title="Command Center"
        accent="Overview"
        subtitle="Operational snapshot — workflows, services, and crew readiness at a glance"
      />

      <StatGrid
        stats={[
          {
            label: "Active work",
            value: loading ? "—" : activeTasks,
            meta: `${data.focusItems.length} focus items today`,
          },
          {
            label: "Open incidents",
            value: loading ? "—" : openIncidents,
            meta: `${data.incidents.filter((i) => i.severity <= 2).length} Sev 1–2`,
          },
          {
            label: "Services",
            value: data.tools.length,
            meta: degradedServices ? `${degradedServices} degraded` : "All healthy",
          },
          {
            label: "Data source",
            value: source === "mock" ? "Mock" : "Live",
            meta: source === "supabase" ? "Supabase connected" : "Local seed data",
          },
        ]}
      />

      <div className="grid-2">
        <Panel title="Priority queue">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.focusItems.slice(0, 5).map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>
                    <StageBadge stage={item.stage} />
                  </td>
                  <td>
                    <StatusBadge status={item.reason} variant="orange" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Service health">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {data.tools.map((tool) => (
                <tr key={tool.id}>
                  <td>{tool.name}</td>
                  <td>
                    <StatusBadge
                      status={tool.status}
                      variant={
                        tool.status === "healthy"
                          ? "green"
                          : tool.status === "degraded"
                            ? "yellow"
                            : "red"
                      }
                    />
                  </td>
                  <td style={{ color: "var(--steel-dim)" }}>{tool.owner ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Recent alerts">
        <table className="data-table">
          <thead>
            <tr>
              <th>Alert</th>
              <th>Severity</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {data.alerts.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className="empty-state">No active alerts — all systems nominal</div>
                </td>
              </tr>
            ) : (
              data.alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.title}</td>
                  <td>
                    {typeof alert.severity === "number" ? (
                      <StatusBadge status={`Sev ${alert.severity}`} variant="orange" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ color: "var(--steel-dim)" }}>{alert.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
