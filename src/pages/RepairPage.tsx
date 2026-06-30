import { Link } from "react-router-dom";
import { EmptyState, PageHeader, Panel, StageBadge, SeverityBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";

const REPAIR_TABLE = "table-scroll table-scroll--wide table-scroll--sticky-first";

export function RepairPage() {
  const { data } = useData();
  const repairWorkflows = data.workflows.filter((w) => w.type === "repair");

  return (
    <>
      <PageHeader
        title="Repair"
        subtitle="Incident remediation workflows linked to services and post-mortems"
      />

      <div className="page-stack">
      <Panel title="Active repairs">
        {repairWorkflows.length === 0 ? (
          <div className="panel-empty" data-empty="incidents" role="status">
            <EmptyState
              title="No active repairs"
              description="Remediation workflows appear here when an incident opens a repair pipeline."
              variant="success"
              action={
                <Link to="/monitor" className="empty-state-link">
                  Open Monitor
                </Link>
              }
            />
          </div>
        ) : (
          <div className={REPAIR_TABLE}>
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
                  const incident = data.incidents.find((i) => i.linkedRepairId === wf.id);
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
                            <SeverityBadge severity={incident.severity} /> {incident.title}
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
          </div>
        )}
      </Panel>

      <Panel title="Runbooks">
        {data.runbooks.length === 0 ? (
          <div className="panel-empty" data-empty="knowledge-vault" role="status">
            <EmptyState
              title="No runbooks indexed"
              description="Service runbooks sync from Obsidian and link here for incident triage and repair steps."
              action={
                <Link to="/knowledge" className="empty-state-link">
                  Open AI & Knowledge
                </Link>
              }
            />
          </div>
        ) : (
          <div className={REPAIR_TABLE}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Runbook</th>
                  <th>Service</th>
                  <th>Obsidian path</th>
                </tr>
              </thead>
              <tbody>
                {data.runbooks.map((rb) => (
                  <tr key={rb.id}>
                    <td>{rb.title}</td>
                    <td>{rb.serviceName}</td>
                    <td className="mono">{rb.obsidianPath}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      </div>
    </>
  );
}
