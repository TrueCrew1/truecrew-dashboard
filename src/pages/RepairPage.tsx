import { Link } from "react-router-dom";
import {
  EmptyState,
  PageHeader,
  Panel,
  StageBadge,
  SeverityBadge,
  TableScroll,
} from "@/components/ui";
import { useData } from "@/context/DataContext";
import { useSelection } from "@/context/SelectionContext";
import { isOpenTaskStage } from "../../lib/queries/dashboard-stats";

export function RepairPage() {
  const { selectedEntityId, setSelectedEntityId } = useSelection();
  const { data } = useData();
  const repairWorkflows = data.workflows.filter((w) => w.type === "repair");
  const activeRepairs = repairWorkflows.filter((w) => isOpenTaskStage(w.stage));

  return (
    <>
      <PageHeader
        title="Repair"
        subtitle="Incident remediation workflows linked to services and runbooks"
      />

      <div className="page-stack">
        <Panel title="Active repairs">
          {activeRepairs.length === 0 ? (
            <div className="panel-empty" data-empty="repairs" role="status">
              <EmptyState
                title={
                  repairWorkflows.length === 0
                    ? "No repair workflows"
                    : "No active repairs"
                }
                description={
                  repairWorkflows.length === 0
                    ? "Remediation workflows appear here when an incident opens a repair pipeline."
                    : "All repair workflows are closed or archived. Open Monitor if a new incident needs triage."
                }
                variant={repairWorkflows.length === 0 ? "default" : "success"}
                action={
                  <Link to="/monitor" className="empty-state-link">
                    {repairWorkflows.length === 0 ? "Open Monitor" : "Check Monitor for incidents"}
                  </Link>
                }
              />
            </div>
          ) : (
            <TableScroll
              wide
              stickyFirst
              label="Active repairs table; scroll horizontally on smaller screens to view linked incident details."
            >
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
                  {activeRepairs.map((wf) => {
                    const incident = data.incidents.find((i) => i.linkedRepairId === wf.id);
                    const rowId = wf.linkedTaskIds[0] ?? wf.id;
                    return (
                      <tr
                        key={wf.id}
                        className={`clickable-row${selectedEntityId === rowId ? " selected" : ""}`}
                        onClick={() => setSelectedEntityId(rowId)}
                      >
                        <td className="cell-truncate" title={wf.title}>
                          {wf.title}
                        </td>
                        <td>
                          <StageBadge stage={wf.stage} />
                        </td>
                        <td>{wf.owner}</td>
                        <td className="cell-truncate" title={incident?.title}>
                          {incident ? (
                            <>
                              <SeverityBadge severity={incident.severity} /> {incident.title}
                            </>
                          ) : (
                            <span className="cell-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title="Runbooks">
          {data.runbooks.length === 0 ? (
            <div className="panel-empty" data-empty="runbooks" role="status">
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
            <TableScroll
              wide
              stickyFirst
              label="Runbooks table; scroll horizontally on smaller screens to view Obsidian paths."
              className="table-scroll--path-heavy"
            >
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
                      <td className="cell-truncate" title={rb.title}>
                        {rb.title}
                      </td>
                      <td>{rb.serviceName}</td>
                      <td className="cell-mono cell-truncate" title={rb.obsidianPath}>
                        {rb.obsidianPath}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      </div>
    </>
  );
}
