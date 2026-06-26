import { mockData } from "@/data/mockData";
import { PageHeader, Panel, StageBadge, SeverityBadge } from "@/components/ui";

export function RepairPage() {
  const repairWorkflows = mockData.workflows.filter((w) => w.type === "repair");

  return (
    <>
      <PageHeader
        title="Repair"
        subtitle="Incident remediation workflows linked to services and post-mortems"
      />

      <Panel title="Active repairs">
        <table className="data-table">
          <thead>
            <tr>
              <th>Repair</th>
              <th>Stage</th>
              <th>Owner</th>
              <th>Linked incident</th>
            </tr>
          </thead>
          <tbody>
            {repairWorkflows.map((wf) => {
              const incident = mockData.incidents.find(
                (i) => i.linkedRepairId === wf.id,
              );
              return (
                <tr key={wf.id}>
                  <td>{wf.title}</td>
                  <td>
                    <StageBadge stage={wf.stage} />
                  </td>
                  <td>{wf.owner}</td>
                  <td>
                    {incident ? (
                      <>
                        <SeverityBadge severity={incident.severity} />{" "}
                        {incident.title}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel title="Runbooks">
        <table className="data-table">
          <thead>
            <tr>
              <th>Runbook</th>
              <th>Service</th>
              <th>Obsidian path</th>
            </tr>
          </thead>
          <tbody>
            {mockData.runbooks.map((rb) => (
              <tr key={rb.id}>
                <td>{rb.title}</td>
                <td>{rb.serviceName}</td>
                <td className="mono">{rb.obsidianPath}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
