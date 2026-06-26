import { PageHeader, PageShell, Panel, StatGrid, StageBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { WorkflowStage } from "@/types";

export function DashboardPage() {
  const { data } = useData();

  const stageCounts = Object.values(WorkflowStage).reduce(
    (acc, stage) => {
      acc[stage] = data.tasks.filter((t) => t.stage === stage).length;
      return acc;
    },
    {} as Record<WorkflowStage, number>,
  );

  return (
    <PageShell>
      <PageHeader
        kicker="Operational overview"
        title="Dashboard"
        accent="Overview"
        subtitle="Operational snapshot across workflows, services, and customers"
      />

      <StatGrid
        stats={[
          {
            label: "Active tasks",
            value: data.tasks.filter((t) => t.stage !== WorkflowStage.Logged).length,
            meta: `${stageCounts[WorkflowStage.InProgress]} in progress`,
          },
          {
            label: "Open incidents",
            value: data.incidents.filter((i) => i.status !== "resolved").length,
            meta: `${data.incidents.filter((i) => i.severity <= 2).length} Sev 1–2`,
          },
          {
            label: "Services",
            value: data.tools.length,
            meta: `${data.tools.filter((t) => t.status !== "healthy").length} degraded`,
          },
          {
            label: "Customers",
            value: data.customers.filter((c) => c.status === "active").length,
            meta: `${data.customers.filter((c) => c.status === "onboarding").length} onboarding`,
          },
        ]}
      />

      <div className="grid-2">
        <Panel title="Workflow pipeline">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stageCounts).map(([stage, count]) => (
                <tr key={stage}>
                  <td>
                    <StageBadge stage={stage as WorkflowStage} />
                  </td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Recent deploys">
          <table className="data-table">
            <thead>
              <tr>
                <th>Deploy</th>
                <th>Stage</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {data.deploys.map((d) => (
                <tr key={d.id}>
                  <td>{d.serviceName}</td>
                  <td>
                    <StageBadge stage={d.stage} />
                  </td>
                  <td className="mono">{d.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </PageShell>
  );
}
