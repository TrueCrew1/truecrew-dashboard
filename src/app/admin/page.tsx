"use client";

import { PageHeader, Panel, StatGrid, StatusBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";

const integrations = [
  { name: "Supabase", status: "Connected", variant: "green" as const },
  { name: "GitHub Webhooks", status: "Active", variant: "green" as const },
  { name: "Obsidian Sync", status: "Phase C", variant: "yellow" as const },
  { name: "Vercel Deploy", status: "Production", variant: "blue" as const },
];

const stageConfig = [
  "Inbox",
  "Triage",
  "Planned",
  "In Progress",
  "Waiting",
  "Review",
  "Done",
  "Logged",
];

export default function AdminPage() {
  const { data, source } = useData();

  return (
    <>
      <PageHeader
        title="Administration"
        subtitle="Integrations, workflow configuration, and platform settings"
      />

      <StatGrid
        stats={[
          { label: "Integrations", value: integrations.length, meta: "3 active · 1 planned" },
          { label: "Workflow stages", value: stageConfig.length, meta: "Pipeline configuration" },
          { label: "Services tracked", value: data.tools.length, meta: "Health monitoring" },
          { label: "Environment", value: source === "mock" ? "Development" : "Production", meta: `Source: ${source}` },
        ]}
      />

      <div className="grid-2">
        <Panel title="Integrations">
          <table className="data-table">
            <thead>
              <tr>
                <th>Integration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>
                    <StatusBadge status={item.status} variant={item.variant} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Workflow stages">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Stage</th>
                <th>Gate policy</th>
              </tr>
            </thead>
            <tbody>
              {stageConfig.map((stage, index) => (
                <tr key={stage}>
                  <td className="mono">{index + 1}</td>
                  <td>{stage}</td>
                  <td style={{ color: "var(--steel-dim)" }}>
                    {stage === "Review" || stage === "Done" ? "Required gates" : "Optional"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Platform settings">
        <table className="data-table">
          <thead>
            <tr>
              <th>Setting</th>
              <th>Value</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Data source</td>
              <td className="mono">{source}</td>
              <td style={{ color: "var(--steel-dim)" }}>Live API or mock seed data</td>
            </tr>
            <tr>
              <td>Gate automation</td>
              <td className="mono">GitHub webhooks</td>
              <td style={{ color: "var(--steel-dim)" }}>PR/CI events update gate status</td>
            </tr>
            <tr>
              <td>Alert routing</td>
              <td className="mono">Context rail</td>
              <td style={{ color: "var(--steel-dim)" }}>Sev 1–2 incidents surface in top bar</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  );
}
