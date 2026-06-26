import { mockData } from "@/data/mockData";
import { PageHeader, Panel, StatGrid, StageBadge } from "@/components/ui";
import { WorkflowStage } from "@/types";

export function DashboardPage() {
  const stageCounts = Object.values(WorkflowStage).reduce(
    (acc, stage) => {
      acc[stage] = mockData.tasks.filter((t) => t.stage === stage).length;
      return acc;
    },
    {} as Record<WorkflowStage, number>,
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        accent="Overview"
        subtitle="Operational snapshot across workflows, services, and customers"
      />

      <StatGrid
        stats={[
          {
            label: "Active tasks",
            value: mockData.tasks.filter((t) => t.stage !== WorkflowStage.Logged).length,
            meta: `${stageCounts[WorkflowStage.InProgress]} in progress`,
          },
          {
            label: "Open incidents",
            value: mockData.incidents.filter((i) => i.status !== "resolved").length,
            meta: `${mockData.incidents.filter((i) => i.severity <= 2).length} Sev 1–2`,
          },
          {
            label: "Services",
            value: mockData.tools.length,
            meta: `${mockData.tools.filter((t) => t.status !== "healthy").length} degraded`,
          },
          {
            label: "Customers",
            value: mockData.customers.filter((c) => c.status === "active").length,
            meta: `${mockData.customers.filter((c) => c.status === "onboarding").length} onboarding`,
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
              {mockData.deploys.map((d) => (
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
    </>
  );
}
