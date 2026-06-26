import { PageHeader, Panel } from "@/components/ui";
import { WORKFLOW_STAGES } from "@/types";

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Stage-gate rules, routing configuration, users, and integrations"
      />

      <div className="grid-2">
        <Panel title="Workflow stages">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {WORKFLOW_STAGES.map((stage, i) => (
                <tr key={stage}>
                  <td>{i + 1}</td>
                  <td>{stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Integrations">
          <table className="data-table">
            <thead>
              <tr>
                <th>Integration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>GitHub</td>
                <td style={{ color: "var(--steel-dim)" }}>Not connected</td>
              </tr>
              <tr>
                <td>Obsidian vault</td>
                <td style={{ color: "var(--steel-dim)" }}>Not connected</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Personas & permissions">
        <table className="data-table">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Founder</td>
              <td style={{ color: "var(--steel-dim)" }}>
                Full read/write/admin; can override stage gates
              </td>
            </tr>
            <tr>
              <td>Operator</td>
              <td style={{ color: "var(--steel-dim)" }}>
                Execute workflows; cannot edit rules or delete entities
              </td>
            </tr>
            <tr>
              <td>Observer</td>
              <td style={{ color: "var(--steel-dim)" }}>
                Read-only dashboards and service catalog
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </>
  );
}
